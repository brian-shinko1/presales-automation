import { google } from "googleapis"

export async function getGoogleDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  
  return google.drive({ version: "v3", auth })
}

export async function uploadToGoogleDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = "application/json"
) {
  const drive = await getGoogleDriveClient(accessToken)
  
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
    },
    media: {
      mimeType,
      body: content,
    },
    fields: "id, name, webViewLink",
  })
  
  return response.data
}

export async function listDriveFiles(
  accessToken: string,
  query?: string
) {
  const drive = await getGoogleDriveClient(accessToken)
  
  const response = await drive.files.list({
    q: query,
    fields: "files(id, name, mimeType, webViewLink, createdTime, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  })
  
  return response.data.files || []
}

export async function downloadDriveFile(
  accessToken: string,
  fileId: string
) {
  const drive = await getGoogleDriveClient(accessToken)
  
  const response = await drive.files.get({
    fileId,
    alt: "media",
  })
  
  return response.data
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string
) {
  const drive = await getGoogleDriveClient(accessToken)
  
  await drive.files.delete({
    fileId,
  })
  
  return true
}

export async function listDriveItems(
  accessToken: string,
  parentId: string = "root"
) {
  const drive = await getGoogleDriveClient(accessToken)

  const q = parentId === "root"
    ? `trashed=false and ('root' in parents or sharedWithMe=true)`
    : `'${parentId}' in parents and trashed=false`

  const response = await drive.files.list({
    q,
    fields: "files(id, name, mimeType, webViewLink)",
    orderBy: "folder,name",
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  return response.data.files || []
}

export async function searchDriveFiles(
  accessToken: string,
  query: string
) {
  const drive = await getGoogleDriveClient(accessToken)

  const safe = query.replace(/'/g, "\\'")
  const response = await drive.files.list({
    q: `name contains '${safe}' and trashed=false`,
    fields: "files(id, name, mimeType, webViewLink)",
    orderBy: "name",
    pageSize: 50,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  return response.data.files || []
}

export async function listSubfolders(
  accessToken: string,
  parentId: string = "root"
) {
  const drive = await getGoogleDriveClient(accessToken)

  // For root, also include folders shared with the user
  const q = parentId === "root"
    ? `mimeType='application/vnd.google-apps.folder' and trashed=false and ('root' in parents or sharedWithMe=true)`
    : `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`

  const response = await drive.files.list({
    q,
    fields: "files(id, name)",
    orderBy: "name",
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  return response.data.files || []
}

export async function searchFolders(
  accessToken: string,
  query: string
) {
  const drive = await getGoogleDriveClient(accessToken)

  const safe = query.replace(/'/g, "\\'")
  const response = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name contains '${safe}' and trashed=false`,
    fields: "files(id, name)",
    orderBy: "name",
    pageSize: 50,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  return response.data.files || []
}

export async function createFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
) {
  const drive = await getGoogleDriveClient(accessToken)
  
  const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  }
  
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId]
  }
  
  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, webViewLink",
  })
  
  return response.data
}
