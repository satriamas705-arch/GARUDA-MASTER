import {
  Peserta,
  Penguji,
  Kelompok,
  PenilaianPeserta,
  AppSettings,
  AuthUser,
} from '../types';
import { GOOGLE_DRIVE_FOLDER_ID, GOOGLE_DRIVE_FOLDER_URL } from './googleDrive';

export const SPREADSHEET_TITLE_DEFAULT = 'Rekapitulasi & Penilaian Pramuka Garuda - Banyumas';

export interface SheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  syncedAt: string;
  totalPeserta: number;
  totalLulus: number;
  totalBelumLulus: number;
  totalBelumDinilai: number;
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime?: string;
  createdTime?: string;
}

/**
 * Searches for an existing Spreadsheet in the target Drive folder,
 * or across accessible Drive files, or creates a new one inside the target folder.
 */
export async function findOrCreateSpreadsheet(
  accessToken: string,
  folderId: string = GOOGLE_DRIVE_FOLDER_ID,
  customTitle?: string
): Promise<{ id: string; name: string; webViewLink: string; isNew: boolean }> {
  const targetTitle = customTitle || SPREADSHEET_TITLE_DEFAULT;

  // 1. Check inside target folder for an existing spreadsheet
  try {
    const query = encodeURIComponent(
      `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const fields = encodeURIComponent('files(id, name, webViewLink, modifiedTime)');
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      const files: any[] = data.files || [];
      // Look for one matching our title or any spreadsheet in this specific folder
      const exactMatch = files.find((f) => f.name === targetTitle);
      if (exactMatch) {
        return {
          id: exactMatch.id,
          name: exactMatch.name,
          webViewLink: exactMatch.webViewLink || `https://docs.google.com/spreadsheets/d/${exactMatch.id}/edit`,
          isNew: false,
        };
      }
      if (files.length > 0) {
        return {
          id: files[0].id,
          name: files[0].name,
          webViewLink: files[0].webViewLink || `https://docs.google.com/spreadsheets/d/${files[0].id}/edit`,
          isNew: false,
        };
      }
    }
  } catch (err) {
    console.warn('Error querying folder for spreadsheet:', err);
  }

  // 2. Global search for matching spreadsheet name if folder search returned nothing
  try {
    const globalQuery = encodeURIComponent(
      `mimeType = 'application/vnd.google-apps.spreadsheet' and name contains 'Pramuka Garuda' and trashed = false`
    );
    const fields = encodeURIComponent('files(id, name, webViewLink, modifiedTime)');
    const globalSearchUrl = `https://www.googleapis.com/drive/v3/files?q=${globalQuery}&fields=${fields}&orderBy=modifiedTime desc&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const res = await fetch(globalSearchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      const files: any[] = data.files || [];
      if (files.length > 0) {
        return {
          id: files[0].id,
          name: files[0].name,
          webViewLink: files[0].webViewLink || `https://docs.google.com/spreadsheets/d/${files[0].id}/edit`,
          isNew: false,
        };
      }
    }
  } catch (err) {
    console.warn('Error global searching for spreadsheet:', err);
  }

  // 3. Create a new Spreadsheet file inside target folder
  try {
    const createUrl = 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,webViewLink';
    const metadataWithParent = {
      name: targetTitle,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId],
      description: 'Spreadsheet Sinkronisasi Nilai Pramuka Garuda Kwartir Cabang Banyumas',
    };

    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadataWithParent),
    });

    if (res.ok) {
      const created = await res.json();
      return {
        id: created.id,
        name: created.name || targetTitle,
        webViewLink: created.webViewLink || `https://docs.google.com/spreadsheets/d/${created.id}/edit`,
        isNew: true,
      };
    }

    // Fallback without parent folder if folder is restricted or read-only
    console.warn('Direct parent creation failed with status', res.status, 'trying fallback at Drive root');
  } catch (err) {
    console.warn('Error creating spreadsheet with parent:', err);
  }

  // 4. Fallback creation in user's root Drive
  const rootCreateUrl = 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,webViewLink';
  const rootMetadata = {
    name: targetTitle,
    mimeType: 'application/vnd.google-apps.spreadsheet',
    description: '[Pramuka Garuda] Rekapitulasi & Penilaian (Disimpan di Google Drive)',
  };

  const rootRes = await fetch(rootCreateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rootMetadata),
  });

  if (!rootRes.ok) {
    const err = await rootRes.json().catch(() => ({}));
    throw new Error(
      err.error?.message || `Gagal membuat Google Spreadsheet di Google Drive (Status: ${rootRes.status})`
    );
  }

  const rootCreated = await rootRes.json();
  return {
    id: rootCreated.id,
    name: rootCreated.name || targetTitle,
    webViewLink: rootCreated.webViewLink || `https://docs.google.com/spreadsheets/d/${rootCreated.id}/edit`,
    isNew: true,
  };
}

/**
 * Prepares the spreadsheet tabs and ensures required sheets exist.
 */
async function ensureSpreadsheetSheets(
  accessToken: string,
  spreadsheetId: string,
  requiredTitles: string[]
): Promise<Map<string, number>> {
  // 1. Get spreadsheet metadata to see existing sheets
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const res = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membaca struktur Google Spreadsheet (${res.status})`);
  }

  const meta = await res.json();
  const existingSheets: { sheetId: number; title: string }[] = (meta.sheets || []).map(
    (s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })
  );

  const sheetMap = new Map<string, number>();
  existingSheets.forEach((s) => sheetMap.set(s.title, s.sheetId));

  // Determine missing sheets
  const missingTitles = requiredTitles.filter((title) => !sheetMap.has(title));

  if (missingTitles.length > 0) {
    const addRequests = missingTitles.map((title) => ({
      addSheet: {
        properties: {
          title,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    }));

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const updateRes = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addRequests }),
    });

    if (updateRes.ok) {
      const updateData = await updateRes.json();
      (updateData.replies || []).forEach((reply: any, index: number) => {
        if (reply.addSheet?.properties) {
          sheetMap.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId);
        }
      });
    }
  }

  // If there's an unused default "Sheet1" and we have custom tabs, clean it up
  const defaultSheet = existingSheets.find((s) => s.title === 'Sheet1' || s.title === 'Sheet 1');
  if (defaultSheet && sheetMap.size > 1 && !requiredTitles.includes(defaultSheet.title)) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{ deleteSheet: { sheetId: defaultSheet.sheetId } }],
        }),
      });
      sheetMap.delete(defaultSheet.title);
    } catch (e) {
      // Non-fatal if delete fails
    }
  }

  return sheetMap;
}

/**
 * Builds table rows and cells for all sheets and writes them in a single batchUpdate.
 */
export async function syncDataToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  data: {
    peserta: Peserta[];
    penguji: Penguji[];
    kelompok: Kelompok[];
    penilaian: Record<string, PenilaianPeserta>;
    settings: AppSettings;
  },
  currentUser?: AuthUser | null
): Promise<SheetsSyncResult> {
  const REQUIRED_SHEETS = [
    'REKAPITULASI HASIL',
    'DETAIL WAWANCARA',
    'DETAIL ADMINISTRASI',
    'DATA PESERTA',
    'DATA PENGUJI',
    'DATA TIM PENILAI',
    'INFORMASI SINKRONISASI',
  ];

  // 1. Ensure sheets exist
  const sheetMap = await ensureSpreadsheetSheets(accessToken, spreadsheetId, REQUIRED_SHEETS);

  // Helper lookups
  const pengujiMap = new Map<string, Penguji>();
  data.penguji.forEach((p) => pengujiMap.set(p.id, p));

  const kelompokMap = new Map<string, Kelompok>();
  data.kelompok.forEach((k) => kelompokMap.set(k.id, k));

  let totalLulus = 0;
  let totalBelumLulus = 0;
  let totalBelumDinilai = 0;

  // --- SHEET 1: REKAPITULASI HASIL ---
  const rekapHeader = [
    'No',
    'No. Peserta',
    'Nama Peserta',
    'L/P',
    'Pangkalan / Gugus Depan',
    'Golongan',
    'Tingkat TKU',
    'Tim Penilai (Kelompok)',
    'Nama Penguji',
    'Administrasi (Item Lengkap)',
    'Wawancara (Total Skor)',
    'Persentase Nilai',
    'Status Kelulusan',
    'Catatan Penguji',
    'Tanggal Penilaian',
  ];

  const rekapRows: any[][] = [rekapHeader];

  data.peserta.forEach((p, idx) => {
    const pen = data.penilaian[p.id];
    const kel = p.kelompokId ? kelompokMap.get(p.kelompokId) : undefined;
    const pj = pen?.pengujiId ? pengujiMap.get(pen.pengujiId) : undefined;

    let adminText = 'Belum Dinilai';
    let wawancaraSkorText = '-';
    let persenText = '-';
    let statusText = 'Belum Dinilai';
    let catatanText = pen?.catatanUmum || '-';
    let tanggalText = pen?.tanggalPenilaian || '-';

    if (pen && pen.administrasi && pen.wawancara) {
      const adminCount = pen.administrasi.filter((a) => a.tersedia).length;
      const totalAdminItems = pen.administrasi.length || 14;
      const adminPassed = adminCount === totalAdminItems;
      adminText = `${adminCount}/${totalAdminItems} (${adminPassed ? 'Lengkap' : 'Belum Lengkap'})`;

      const wawancaraSum = pen.wawancara.reduce((sum, item) => sum + (item.poin || 0), 0);
      const maxWawancara = pen.wawancara.length * 5;
      const persen = maxWawancara > 0 ? (wawancaraSum / maxWawancara) * 100 : 0;

      wawancaraSkorText = `${wawancaraSum} / ${maxWawancara}`;
      persenText = `${persen.toFixed(2)}%`;

      if (adminPassed && persen >= 80) {
        statusText = 'LULUS';
        totalLulus++;
      } else {
        statusText = 'BELUM LULUS';
        totalBelumLulus++;
      }
    } else {
      totalBelumDinilai++;
    }

    rekapRows.push([
      idx + 1,
      p.nomorPeserta || '-',
      p.nama,
      p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      `${p.pangkalan} (${p.gudep || '-'})`,
      p.golongan || data.settings.golongan,
      p.tingkatTKU || 'Terap',
      kel?.nama || '-',
      pj?.nama || kel?.namaPenguji || '-',
      adminText,
      wawancaraSkorText,
      persenText,
      statusText,
      catatanText,
      tanggalText,
    ]);
  });

  // --- SHEET 2: DETAIL WAWANCARA ---
  const wawancaraHeader = [
    'No',
    'No. Peserta',
    'Nama Peserta',
    'Pangkalan',
    '1. Salam & Visi',
    '2. SKU Ramu-Rakit-Terap',
    '3. Menunjukkan TKU Terap',
    '4. 5 Bidang SKK',
    '5. TKK Utama & Madya',
    '6. Arti Lambang Garuda',
    '7. Keteladanan',
    '8. 6 Hasta Karya',
    '9. Uji Bakat',
    '10. Simpul & Ikatan',
    '11. Teknologi / IG',
    'Total Poin',
    'Persentase',
    'Status',
    'Catatan Penguji',
  ];

  const wawancaraRows: any[][] = [wawancaraHeader];

  data.peserta.forEach((p, idx) => {
    const pen = data.penilaian[p.id];
    const row: any[] = [idx + 1, p.nomorPeserta || '-', p.nama, p.pangkalan];

    if (pen?.wawancara && pen.wawancara.length > 0) {
      let sum = 0;
      for (let i = 1; i <= 11; i++) {
        const item = pen.wawancara.find((w) => w.id === i);
        const pt = item ? item.poin : 0;
        sum += pt;
        row.push(pt);
      }
      const maxPt = 55;
      const pct = (sum / maxPt) * 100;
      row.push(sum);
      row.push(`${pct.toFixed(2)}%`);
      row.push(pct >= 80 ? 'MEMENUHI (>=80%)' : 'BELUM MEMENUHI');
      row.push(pen.catatanUmum || '-');
    } else {
      for (let i = 1; i <= 11; i++) row.push('-');
      row.push('-', '-', 'Belum Dinilai', '-');
    }

    wawancaraRows.push(row);
  });

  // --- SHEET 3: DETAIL ADMINISTRASI ---
  const adminHeader = [
    'No',
    'No. Peserta',
    'Nama Peserta',
    'Pangkalan',
    '1. SKU Ramu',
    '2. STL Ramu',
    '3. SKU Rakit',
    '4. STL Rakit',
    '5. SKU Terap',
    '6. STL Terap',
    '7. SKK 25 TKK',
    '8. STL SKK',
    '9. TKK Utama-Madya',
    '10. Foto Hasta Karya',
    '11. Ket. Orang Tua',
    '12. Ket. RT/RW',
    '13. Ket. Pembina',
    '14. Ket. Kamabigus',
    'Berkas Lengkap',
    'Status Administrasi',
  ];

  const adminRows: any[][] = [adminHeader];

  data.peserta.forEach((p, idx) => {
    const pen = data.penilaian[p.id];
    const row: any[] = [idx + 1, p.nomorPeserta || '-', p.nama, p.pangkalan];

    if (pen?.administrasi && pen.administrasi.length > 0) {
      let completeCount = 0;
      for (let i = 1; i <= 14; i++) {
        const item = pen.administrasi.find((a) => a.id === i);
        if (item?.tersedia) {
          completeCount++;
          row.push('YA (Lengkap)');
        } else {
          row.push(item?.catatan ? `BELUM: ${item.catatan}` : 'BELUM');
        }
      }
      row.push(`${completeCount} / 14`);
      row.push(completeCount === 14 ? 'LENGKAP' : 'BELUM LENGKAP');
    } else {
      for (let i = 1; i <= 14; i++) row.push('-');
      row.push('-', 'Belum Dinilai');
    }

    adminRows.push(row);
  });

  // --- SHEET 4: DATA PESERTA ---
  const pesertaHeader = [
    'No',
    'ID Peserta',
    'Nomor Peserta',
    'Nama Lengkap',
    'Jenis Kelamin',
    'Pangkalan / Gugus Depan',
    'Nomor Gudep',
    'Golongan',
    'Tingkat TKU',
    'Kontak HP / WhatsApp',
    'Nama Pembina Pendamping',
    'Tim Penilai / Kelompok',
  ];

  const pesertaRows: any[][] = [pesertaHeader];
  data.peserta.forEach((p, idx) => {
    const kel = p.kelompokId ? kelompokMap.get(p.kelompokId) : undefined;
    pesertaRows.push([
      idx + 1,
      p.id,
      p.nomorPeserta || '-',
      p.nama,
      p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      p.pangkalan,
      p.gudep || '-',
      p.golongan || data.settings.golongan,
      p.tingkatTKU || 'Terap',
      p.kontakHp || '-',
      p.namaPembina || '-',
      kel?.nama || '-',
    ]);
  });

  // --- SHEET 5: DATA PENGUJI ---
  const pengujiHeader = [
    'No',
    'ID Penguji',
    'Nama Lengkap Penguji',
    'NIP / NTA',
    'Jabatan',
    'Pangkalan / Instansi',
    'Nomor HP / WhatsApp',
  ];

  const pengujiRows: any[][] = [pengujiHeader];
  data.penguji.forEach((pj, idx) => {
    pengujiRows.push([
      idx + 1,
      pj.id,
      pj.nama,
      pj.nipNta || '-',
      pj.jabatan || '-',
      pj.pangkalan || '-',
      pj.noHp || '-',
    ]);
  });

  // --- SHEET 6: DATA TIM PENILAI ---
  const kelompokHeader = [
    'No',
    'ID Kelompok',
    'Nama Tim Penilai',
    'Kategori',
    'Pangkalan',
    'Tim Penguji Bertugas',
    'Pemimpin Regu',
    'Pembina Pendamping',
    'Catatan / Keterangan',
  ];

  const kelompokRows: any[][] = [kelompokHeader];
  data.kelompok.forEach((k, idx) => {
    kelompokRows.push([
      idx + 1,
      k.id,
      k.nama,
      k.jenisKelamin,
      k.pangkalan,
      k.namaPenguji,
      k.pemimpinRegu || '-',
      k.pembinaPendamping || '-',
      k.keterangan || '-',
    ]);
  });

  // --- SHEET 7: INFORMASI SINKRONISASI ---
  const now = new Date();
  const infoRows: any[][] = [
    ['Parameter Sistem', 'Nilai & Keterangan'],
    ['Aplikasi', 'Sistem Penilaian Pencapaian Pramuka Garuda Banyumas'],
    ['Kwartir Cabang', data.settings.kwartirCabang || 'KWARTIR CABANG BANYUMAS'],
    ['Kwartir Ranting', data.settings.kwarran || 'KWARRAN KEMRANJEN'],
    ['Golongan', data.settings.golongan || 'GOLONGAN PENGGALANG'],
    ['Tahun Pelaksanaan', data.settings.tahun || '2026'],
    ['Tempat Penilaian', data.settings.tempat || 'Banyumas'],
    ['Ketua Panitia / Mabigus', data.settings.mabigusAtauKetuaPanitia || '-'],
    ['Waktu Terakhir Sinkron', now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })],
    ['ISO Timestamp', now.toISOString()],
    ['Disinkronkan Oleh', currentUser ? `${currentUser.displayName} (${currentUser.role})` : 'Petugas Penilai'],
    ['Folder Target Google Drive', GOOGLE_DRIVE_FOLDER_URL],
    ['Total Peserta Terdaftar', String(data.peserta.length)],
    ['Peserta Dinyatakan Lulus', String(totalLulus)],
    ['Peserta Belum Lulus', String(totalBelumLulus)],
    ['Peserta Belum Dinilai', String(totalBelumDinilai)],
    ['Total Tim Penguji', String(data.penguji.length)],
    ['Total Tim Penilai / Kelompok', String(data.kelompok.length)],
  ];

  // 2. Batch update cell values across all sheets
  const valuePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'REKAPITULASI HASIL'!A1",
        values: rekapRows,
      },
      {
        range: "'DETAIL WAWANCARA'!A1",
        values: wawancaraRows,
      },
      {
        range: "'DETAIL ADMINISTRASI'!A1",
        values: adminRows,
      },
      {
        range: "'DATA PESERTA'!A1",
        values: pesertaRows,
      },
      {
        range: "'DATA PENGUJI'!A1",
        values: pengujiRows,
      },
      {
        range: "'DATA TIM PENILAI'!A1",
        values: kelompokRows,
      },
      {
        range: "'INFORMASI SINKRONISASI'!A1",
        values: infoRows,
      },
    ],
  };

  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const valRes = await fetch(valuesUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(valuePayload),
  });

  if (!valRes.ok) {
    const err = await valRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal memperbarui sel data Google Sheets (${valRes.status})`);
  }

  // 3. Optional: apply visual styling to header rows (amber/gold scout theme)
  try {
    const formatRequests: any[] = [];
    sheetMap.forEach((sId) => {
      formatRequests.push(
        // Freeze header row
        {
          updateSheetProperties: {
            properties: {
              sheetId: sId,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        // Format row 1 with Amber Scout styling: Dark Brown background, White Bold text
        {
          repeatCell: {
            range: {
              sheetId: sId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.45, green: 0.22, blue: 0.05 }, // Warm scout amber-brown
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                  fontSize: 10,
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        }
      );
    });

    if (formatRequests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formatRequests }),
      });
    }
  } catch (err) {
    console.warn('Formatting spreadsheet headers encountered error (data was saved):', err);
  }

  const webViewLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl: webViewLink,
    spreadsheetTitle: SPREADSHEET_TITLE_DEFAULT,
    syncedAt: now.toISOString(),
    totalPeserta: data.peserta.length,
    totalLulus,
    totalBelumLulus,
    totalBelumDinilai,
  };
}
