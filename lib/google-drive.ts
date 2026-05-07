const DRIVE_API = "https://www.googleapis.com/drive/v3"
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

export async function uploadToGoogleDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = "application/json"
) {
  const metadata = JSON.stringify({ name: fileName, mimeType })
  const boundary = "foo_bar_baz"
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n")

  const res = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: "POST",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listDriveFiles(accessToken: string, query?: string) {
  const params = new URLSearchParams({
    fields: "files(id,name,mimeType,webViewLink,createdTime,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "50",
  })
  if (query) params.set("q", query)

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.files || []
}

export async function downloadDriveFile(accessToken: string, fileId: string) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteDriveFile(accessToken: string, fileId: string) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
  if (!res.ok && res.status !== 204) throw new Error(await res.text())
  return true
}

export async function listDriveItems(
  accessToken: string,
  parentId: string = "root"
) {
  const q =
    parentId === "root"
      ? `trashed=false and ('root' in parents or sharedWithMe=true)`
      : `'${parentId}' in parents and trashed=false`

  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,webViewLink)",
    orderBy: "folder,name",
    pageSize: "100",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  })

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.files || []
}

export async function searchDriveFiles(accessToken: string, query: string) {
  const safe = query.replace(/'/g, "\\'")
  const params = new URLSearchParams({
    q: `name contains '${safe}' and trashed=false`,
    fields: "files(id,name,mimeType,webViewLink)",
    orderBy: "name",
    pageSize: "50",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  })

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.files || []
}

export async function listSubfolders(
  accessToken: string,
  parentId: string = "root"
) {
  const q =
    parentId === "root"
      ? `mimeType='application/vnd.google-apps.folder' and trashed=false and ('root' in parents or sharedWithMe=true)`
      : `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`

  const params = new URLSearchParams({
    q,
    fields: "files(id,name)",
    orderBy: "name",
    pageSize: "100",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  })

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.files || []
}

export async function searchFolders(accessToken: string, query: string) {
  const safe = query.replace(/'/g, "\\'")
  const params = new URLSearchParams({
    q: `mimeType='application/vnd.google-apps.folder' and name contains '${safe}' and trashed=false`,
    fields: "files(id,name)",
    orderBy: "name",
    pageSize: "50",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  })

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.files || []
}

export async function createFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
) {
  const metadata: Record<string, unknown> = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  }
  if (parentFolderId) metadata.parents = [parentFolderId]

  const res = await fetch(`${DRIVE_API}/files?fields=id,name,webViewLink`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
