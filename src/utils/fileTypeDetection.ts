export interface FileInfo {
  filename: string;
  filetype: string;
  size: number;
  r2Key: string;
  uploadedAt: string;
}

export function isProcessableFile(fileInfo: FileInfo): boolean {
  const { filename, filetype } = fileInfo;
  
  // Check by MIME type first
  if (isProcessableMimeType(filetype)) {
    return true;
  }
  
  // Check by file extension as fallback
  return isProcessableExtension(filename);
}

function isProcessableMimeType(mimeType: string): boolean {
  const processableTypes = [
    // RAW image formats
    'image/x-canon-cr2',
    'image/x-canon-crw',
    'image/x-epson-erf',
    'image/x-nikon-nef',
    'image/x-nikon-nrw',
    'image/x-sony-arw',
    'image/x-sony-sr2',
    'image/x-sony-srf',
    'image/x-adobe-dng',
    'image/x-panasonic-raw',
    'image/x-panasonic-rw2',
    'image/x-olympus-orf',
    'image/x-pentax-pef',
    'image/x-samsung-srw',
    'image/x-fuji-raf',
    'image/x-kodak-dcr',
    'image/x-kodak-k25',
    'image/x-kodak-kdc',
    'image/x-minolta-mrw',
    'image/x-minolta-mdc',
    'image/x-mamiya-mef',
    'image/x-raw',
    
    // Video formats
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/3gp',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-flv',
    'video/x-matroska',
    'video/x-ms-wmv'
  ];
  
  return processableTypes.includes(mimeType.toLowerCase());
}

function isProcessableExtension(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop() || '';
  
  const processableExtensions = [
    // RAW image formats
    'cr2', 'crw', 'erf', 'nef', 'nrw', 'arw', 'sr2', 'srf',
    'dng', 'raw', 'rw2', 'orf', 'pef', 'srw', 'raf', 'dcr',
    'k25', 'kdc', 'mrw', 'mdc', 'mef', '3fr', 'ari', 'arw',
    'bay', 'braw', 'c1', 'c2', 'cap', 'cine', 'cr3', 'crw',
    'cs1', 'dc2', 'dcr', 'drf', 'dsc', 'dng', 'eip', 'erf',
    'fff', 'gpr', 'iiq', 'k25', 'kdc', 'mdc', 'mef', 'mos',
    'mrw', 'nef', 'nrw', 'obm', 'orf', 'pef', 'ptx', 'pxn',
    'r3d', 'raf', 'raw', 'rw2', 'rwl', 'rwz', 'srw', 'srf',
    'srw', 'tif', 'tiff', 'x3f',
    
    // Video formats
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp',
    'm4v', 'mpg', 'mpeg', 'm2v', 'm4p', 'm4b', 'm4r', 'm4a',
    'asf', 'rm', 'rmvb', 'vob', 'ogv', 'ogg', 'drc', 'gif',
    'gifv', 'mng', 'svi', '3gp', '3g2', 'mxf', 'roq', 'nsv',
    'f4v', 'f4p', 'f4a', 'f4b'
  ];
  
  return processableExtensions.includes(extension);
}

export function getFileCategory(fileInfo: FileInfo): 'raw_image' | 'video' | 'other' {
  const { filename, filetype } = fileInfo;
  
  // Check for RAW images
  if (isRawImageFile(filename, filetype)) {
    return 'raw_image';
  }
  
  // Check for video files
  if (isVideoFile(filename, filetype)) {
    return 'video';
  }
  
  return 'other';
}


function isRawImageFile(filename: string, mimeType: string): boolean {
  const rawExtensions = [
    'cr2', 'crw', 'erf', 'nef', 'nrw', 'arw', 'sr2', 'srf',
    'dng', 'raw', 'rw2', 'orf', 'pef', 'srw', 'raf', 'dcr',
    'k25', 'kdc', 'mrw', 'mdc', 'mef', '3fr', 'ari', 'arw',
    'bay', 'braw', 'c1', 'c2', 'cap', 'cine', 'cr3', 'crw',
    'cs1', 'dc2', 'dcr', 'drf', 'dsc', 'dng', 'eip', 'erf',
    'fff', 'gpr', 'iiq', 'k25', 'kdc', 'mdc', 'mef', 'mos',
    'mrw', 'nef', 'nrw', 'obm', 'orf', 'pef', 'ptx', 'pxn',
    'r3d', 'raf', 'raw', 'rw2', 'rwl', 'rwz', 'srw', 'srf',
    'srw', 'tif', 'tiff', 'x3f'
  ];
  
  const rawMimeTypes = [
    'image/x-canon-cr2', 'image/x-canon-crw', 'image/x-epson-erf',
    'image/x-nikon-nef', 'image/x-nikon-nrw', 'image/x-sony-arw',
    'image/x-sony-sr2', 'image/x-sony-srf', 'image/x-adobe-dng',
    'image/x-panasonic-raw', 'image/x-panasonic-rw2', 'image/x-olympus-orf',
    'image/x-pentax-pef', 'image/x-samsung-srw', 'image/x-fuji-raf',
    'image/x-kodak-dcr', 'image/x-kodak-k25', 'image/x-kodak-kdc',
    'image/x-minolta-mrw', 'image/x-minolta-mdc', 'image/x-mamiya-mef',
    'image/x-raw'
  ];
  
  const extension = filename.toLowerCase().split('.').pop() || '';
  return rawExtensions.includes(extension) || rawMimeTypes.includes(mimeType.toLowerCase());
}

function isVideoFile(filename: string, mimeType: string): boolean {
  const videoExtensions = [
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp',
    'm4v', 'mpg', 'mpeg', 'm2v', 'm4p', 'm4b', 'm4r', 'm4a',
    'asf', 'rm', 'rmvb', 'vob', 'ogv', 'ogg', 'drc', 'gif',
    'gifv', 'mng', 'svi', '3gp', '3g2', 'mxf', 'roq', 'nsv',
    'f4v', 'f4p', 'f4a', 'f4b'
  ];
  
  const videoMimeTypes = [
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
    'video/webm', 'video/mkv', 'video/3gp', 'video/quicktime',
    'video/x-msvideo', 'video/x-flv', 'video/x-matroska', 'video/x-ms-wmv'
  ];
  
  const extension = filename.toLowerCase().split('.').pop() || '';
  return videoExtensions.includes(extension) || videoMimeTypes.includes(mimeType.toLowerCase());
}
