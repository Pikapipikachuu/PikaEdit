// Default starter files
const DEFAULT_FILES = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <h1>Hello Pika Boy! 🚀</h1>
    <p>Create a folder in Explorer and tap + to add files or import a .zip project.</p>
    <button id="clickBtn">Test JS Click</button>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
  "style.css": `body {
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
}

.card {
  background: #1e293b;
  padding: 28px;
  border-radius: 14px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

button {
  margin-top: 14px;
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: #10b981;
  color: #052e16;
  font-weight: bold;
  cursor: pointer;
}`,
  "script.js": `document.getElementById("clickBtn").addEventListener("click", () => {
  console.log("Button clicked successfully!");
  alert("JS is working cleanly!");
});`
};

const STORAGE_KEY = "pikaedit_project_files_v2";
const FOLDERS_KEY = "pikaedit_folders_v2";
const ACTIVE_KEY = "pikaedit_active_file_v2";

// =========================================================================
// 1. UNLIMITED INDEXEDDB STORAGE (Prevents large ZIPs from vanishing!)
// =========================================================================
const DB_NAME = "PikaEditWorkspaceDB";
const DB_STORE = "workspace";
let dbInstance = null;

function openWorkspaceDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    if (dbInstance) return resolve(dbInstance);
    try {
      const req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function idbGet(key) {
  const db = await openWorkspaceDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function idbSet(key, val) {
  const db = await openWorkspaceDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(val, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

function loadLegacyLocalStorage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Object.keys(parsed).length > 0) return parsed;
    }
  } catch (e) {}
  return null;
}

let files = loadLegacyLocalStorage() || { ...DEFAULT_FILES };
let emptyFolders = [];
let expandedFolders = new Set();
let activeFile = "index.html";
let activeBlobUrls = [];
let logCount = 0;

let sheetTargetFolder = "";
let pendingUploadFolder = "";

let saveTimer = null;
function saveWorkspace() {
  // Debounce rapid typing saves while still saving immediately on actions
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 180);
}

async function persistNow() {
  await idbSet("files", files);
  await idbSet("folders", emptyFolders);
  await idbSet("activeFile", activeFile);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(emptyFolders));
    window.localStorage.setItem(ACTIVE_KEY, activeFile);
  } catch (e) {
    // IndexedDB already saved full data even if localStorage 5MB quota is exceeded
  }
}

// =========================================================================
// 2. DISABLE MOBILE PULL-TO-REFRESH COMPLETELY
// =========================================================================
(function preventPullToRefresh() {
  let touchStartY = 0;
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const isPullingDown = currentY > touchStartY;
      if (!isPullingDown) return;

      // Check if any scrollable ancestor is scrolled down; if so, allow scrolling up
      let el = e.target;
      while (el && el !== document.body && el !== document.documentElement) {
        if (el.scrollHeight > el.clientHeight && el.scrollTop > 0) {
          return;
        }
        el = el.parentElement;
      }

      // At top of page/container: block downward pull so browser never triggers refresh
      if (e.cancelable) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
})();

// =========================================================================
// DOM ELEMENTS
// =========================================================================
const moreMenuBtn = document.getElementById("moreMenuBtn");
const waDropdown = document.getElementById("waDropdown");
const menuFullscreenBtn = document.getElementById("menuFullscreenBtn");
const menuSymbolBarBtn = document.getElementById("menuSymbolBarBtn");
const symbolBarState = document.getElementById("symbolBarState");
const menuWordWrapBtn = document.getElementById("menuWordWrapBtn");
const wordWrapState = document.getElementById("wordWrapState");
const menuFindBtn = document.getElementById("menuFindBtn");
const menuSaveZipBtn = document.getElementById("menuSaveZipBtn");
const menuResetBtn = document.getElementById("menuResetBtn");
const exitFullscreenBtn = document.getElementById("exitFullscreenBtn");
const previewFullscreenBtn = document.getElementById("previewFullscreenBtn");

const findBar = document.getElementById("findBar");
const findInput = document.getElementById("findInput");
const findCount = document.getElementById("findCount");
const findPrevBtn = document.getElementById("findPrevBtn");
const findNextBtn = document.getElementById("findNextBtn");
const closeFindBtn = document.getElementById("closeFindBtn");
const symbolBar = document.getElementById("symbolBar");

const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const menuBtn = document.getElementById("menuBtn");
const fileTreeEl = document.getElementById("fileTree");
const currentFileNameEl = document.getElementById("currentFileName");
const codeEditor = document.getElementById("codeEditor");
const lineNumbers = document.getElementById("lineNumbers");
const assetPreviewBox = document.getElementById("assetPreviewBox");
const assetImage = document.getElementById("assetImage");
const assetAudio = document.getElementById("assetAudio");
const assetInfo = document.getElementById("assetInfo");

const zipInput = document.getElementById("zipInput");
const assetUploadInput = document.getElementById("assetUploadInput");
const exportZipBtn = document.getElementById("exportZipBtn");
const newFileBtn = document.getElementById("newFileBtn");
const newFolderBtn = document.getElementById("newFolderBtn");
const resetBtn = document.getElementById("resetBtn");
const runBtn = document.getElementById("runBtn");

const previewModal = document.getElementById("previewModal");
const closePreviewBtn = document.getElementById("closePreviewBtn");
const reloadPreviewBtn = document.getElementById("reloadPreviewBtn");
const previewTitle = document.getElementById("previewTitle");
const previewFrame = document.getElementById("previewFrame");

const consoleToggleBtn = document.getElementById("consoleToggleBtn");
const consolePanel = document.getElementById("consolePanel");
const consoleLogs = document.getElementById("consoleLogs");
const consoleBadge = document.getElementById("consoleBadge");
const clearConsoleBtn = document.getElementById("clearConsoleBtn");

// Folder '+' Bottom Sheet Elements
const folderSheetOverlay = document.getElementById("folderSheetOverlay");
const sheetFolderTitle = document.getElementById("sheetFolderTitle");
const closeSheetBtn = document.getElementById("closeSheetBtn");
const sheetNewFileBtn = document.getElementById("sheetNewFileBtn");
const sheetNewFolderBtn = document.getElementById("sheetNewFolderBtn");
const sheetImportZipBtn = document.getElementById("sheetImportZipBtn");
const sheetUploadFilesBtn = document.getElementById("sheetUploadFilesBtn");
const sheetExportZipBtn = document.getElementById("sheetExportZipBtn");
const sheetRenameFolderBtn = document.getElementById("sheetRenameFolderBtn");

// =========================================================================
// 3. WHATSAPP-STYLE TRIPLE-DOT MENU & TRUE FULL SCREEN MODE
// =========================================================================
function toggleWaDropdown(forceState) {
  const show = typeof forceState === "boolean" ? forceState : waDropdown.classList.contains("hidden");
  waDropdown.classList.toggle("hidden", !show);
  moreMenuBtn.setAttribute("aria-expanded", String(show));
}

moreMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleWaDropdown();
});

document.addEventListener("click", (e) => {
  if (!waDropdown.classList.contains("hidden") && !waDropdown.contains(e.target) && e.target !== moreMenuBtn) {
    toggleWaDropdown(false);
  }
});

// Enter / Exit Pure Full Screen Mode
function enterAppFullscreen() {
  toggleWaDropdown(false);
  closeMobileSidebar();
  document.body.classList.add("app-fullscreen");
  exitFullscreenBtn.classList.remove("hidden");

  const docEl = document.documentElement;
  const reqFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
  if (reqFs) {
    try {
      const p = reqFs.call(docEl);
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) {}
  }
}

function exitAppFullscreen() {
  document.body.classList.remove("app-fullscreen");
  exitFullscreenBtn.classList.add("hidden");

  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) {
    const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exitFs) {
      try {
        const p = exitFs.call(document);
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) {}
    }
  }
}

menuFullscreenBtn.addEventListener("click", enterAppFullscreen);
previewFullscreenBtn.addEventListener("click", enterAppFullscreen);
exitFullscreenBtn.addEventListener("click", exitAppFullscreen);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("app-fullscreen")) {
    exitAppFullscreen();
  }
});

// Toggle Mobile Quick Symbol Bar
menuSymbolBarBtn.addEventListener("click", () => {
  const isHidden = symbolBar.classList.toggle("hidden");
  symbolBarState.textContent = isHidden ? "OFF" : "ON";
  symbolBarState.classList.toggle("on", !isHidden);
  toggleWaDropdown(false);
});

symbolBar.addEventListener("click", (e) => {
  const btn = e.target.closest(".sym-key");
  if (!btn) return;
  const text = btn.getAttribute("data-insert") || "";
  const start = codeEditor.selectionStart;
  const end = codeEditor.selectionEnd;
  codeEditor.value = codeEditor.value.substring(0, start) + text + codeEditor.value.substring(end);
  codeEditor.selectionStart = codeEditor.selectionEnd = start + text.length;
  codeEditor.focus();
  files[activeFile] = codeEditor.value;
  saveWorkspace();
  updateLineNumbers();
});

// Toggle Word Wrap
menuWordWrapBtn.addEventListener("click", () => {
  const wrapped = codeEditor.classList.toggle("word-wrap");
  wordWrapState.textContent = wrapped ? "ON" : "OFF";
  wordWrapState.classList.toggle("on", wrapped);
  toggleWaDropdown(false);
});

// Find in File
let findMatches = [];
let findIndex = -1;

menuFindBtn.addEventListener("click", () => {
  toggleWaDropdown(false);
  findBar.classList.remove("hidden");
  findInput.focus();
  findInput.select();
});

closeFindBtn.addEventListener("click", () => {
  findBar.classList.add("hidden");
  findMatches = [];
  findIndex = -1;
});

function runFindSearch(step = 0) {
  const query = findInput.value;
  const text = codeEditor.value;
  findMatches = [];
  if (query) {
    const lowerText = text.toLowerCase();
    const lowerQ = query.toLowerCase();
    let pos = 0;
    while ((pos = lowerText.indexOf(lowerQ, pos)) !== -1) {
      findMatches.push(pos);
      pos += lowerQ.length;
    }
  }

  if (findMatches.length === 0) {
    findIndex = -1;
    findCount.textContent = "0/0";
    return;
  }

  if (step === 0) {
    findIndex = 0;
  } else {
    findIndex = (findIndex + step + findMatches.length) % findMatches.length;
  }

  findCount.textContent = `${findIndex + 1}/${findMatches.length}`;
  const matchPos = findMatches[findIndex];
  codeEditor.focus();
  codeEditor.setSelectionRange(matchPos, matchPos + query.length);
}

findInput.addEventListener("input", () => runFindSearch(0));
findNextBtn.addEventListener("click", () => runFindSearch(1));
findPrevBtn.addEventListener("click", () => runFindSearch(-1));

// Export & Reset from Dropdown
menuSaveZipBtn.addEventListener("click", () => {
  toggleWaDropdown(false);
  exportZipBtn.click();
});

menuResetBtn.addEventListener("click", () => {
  toggleWaDropdown(false);
  resetBtn.click();
});

// =========================================================================
// COZY POPUP DIALOGS
// =========================================================================
const cozyModalOverlay = document.getElementById("cozyModalOverlay");
const cozyIcon = document.getElementById("cozyIcon");
const cozyTitle = document.getElementById("cozyTitle");
const cozyMessage = document.getElementById("cozyMessage");
const cozyInput = document.getElementById("cozyInput");
const cozyCancelBtn = document.getElementById("cozyCancelBtn");
const cozyConfirmBtn = document.getElementById("cozyConfirmBtn");

function showCozyPopup({
  title = "Notice",
  message = "",
  icon = "✨",
  tone = "info",
  mode = "alert",
  placeholder = "",
  defaultValue = "",
  confirmText = "OK",
  cancelText = "Cancel"
}) {
  return new Promise((resolve) => {
    cozyTitle.textContent = title;
    cozyMessage.textContent = message;
    cozyIcon.textContent = icon;
    cozyIcon.className = `cozy-icon ${tone}`;

    cozyConfirmBtn.textContent = confirmText;
    cozyConfirmBtn.className = `cozy-btn confirm ${tone === "danger" ? "danger" : ""}`;
    cozyCancelBtn.textContent = cancelText;

    if (mode === "alert") {
      cozyCancelBtn.classList.add("hidden");
    } else {
      cozyCancelBtn.classList.remove("hidden");
    }

    if (mode === "prompt") {
      cozyInput.classList.remove("hidden");
      cozyInput.value = defaultValue;
      cozyInput.placeholder = placeholder;
    } else {
      cozyInput.classList.add("hidden");
    }

    cozyModalOverlay.classList.remove("hidden");

    if (mode === "prompt") {
      setTimeout(() => {
        cozyInput.focus();
        cozyInput.setSelectionRange(cozyInput.value.length, cozyInput.value.length);
      }, 40);
    } else {
      setTimeout(() => cozyConfirmBtn.focus(), 40);
    }

    const cleanup = (result) => {
      cozyModalOverlay.classList.add("hidden");
      cozyConfirmBtn.onclick = null;
      cozyCancelBtn.onclick = null;
      cozyModalOverlay.onclick = null;
      cozyInput.onkeydown = null;
      resolve(result);
    };

    cozyConfirmBtn.onclick = () => {
      cleanup(mode === "prompt" ? cozyInput.value : true);
    };

    cozyCancelBtn.onclick = () => {
      cleanup(mode === "prompt" ? null : false);
    };

    cozyModalOverlay.onclick = (e) => {
      if (e.target === cozyModalOverlay) {
        cleanup(mode === "prompt" ? null : false);
      }
    };

    cozyInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        cleanup(cozyInput.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
      }
    };
  });
}

// =========================================================================
// FOLDER & FILE TREE EXPLORER
// =========================================================================
function expandParentsOf(filePath) {
  if (!filePath || !filePath.includes("/")) return;
  const parts = filePath.split("/");
  parts.pop();
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    expandedFolders.add(acc);
  }
}

function findEntryHtml(preferredFolder = "") {
  const keys = Object.keys(files);

  if (preferredFolder) {
    const prefix = preferredFolder + "/";
    const folderKeys = keys.filter((k) => k.startsWith(prefix));
    const exactIndex = folderKeys.find((k) => k.toLowerCase() === `${prefix}index.html`.toLowerCase());
    if (exactIndex) return exactIndex;

    const nestedIndex = folderKeys
      .filter((k) => k.toLowerCase().endsWith("/index.html"))
      .sort((a, b) => a.split("/").length - b.split("/").length)[0];
    if (nestedIndex) return nestedIndex;

    const anyFolderHtml = folderKeys
      .filter((k) => k.toLowerCase().endsWith(".html"))
      .sort((a, b) => a.split("/").length - b.split("/").length)[0];
    if (anyFolderHtml) return anyFolderHtml;
  }

  const rootIndex = keys.find((k) => k.toLowerCase() === "index.html");
  if (rootIndex) return rootIndex;

  const nestedIndexes = keys
    .filter((k) => k.toLowerCase().endsWith("/index.html"))
    .sort((a, b) => a.split("/").length - b.split("/").length);
  if (nestedIndexes.length > 0) return nestedIndexes[0];

  const anyHtml = keys
    .filter((k) => k.toLowerCase().endsWith(".html"))
    .sort((a, b) => a.split("/").length - b.split("/").length);
  return anyHtml[0] || null;
}

function getFileIcon(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "🌐";
  if (lower.endsWith(".css")) return "🎨";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "⚡";
  if (lower.endsWith(".json")) return "📋";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"].some((ext) => lower.endsWith(ext))) return "🖼️";
  if ([".mp3", ".wav", ".ogg", ".m4a", ".aac"].some((ext) => lower.endsWith(ext))) return "🎵";
  if ([".mp4", ".webm"].some((ext) => lower.endsWith(ext))) return "🎬";
  if ([".ttf", ".otf", ".woff", ".woff2"].some((ext) => lower.endsWith(ext))) return "🔤";
  return "📄";
}

function buildTreeStructure() {
  const root = { folders: {}, files: [] };

  for (const folderPath of emptyFolders) {
    const parts = folderPath.split("/").filter(Boolean);
    let node = root;
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!node.folders[part]) {
        node.folders[part] = { name: part, path: currentPath, folders: {}, files: [] };
      }
      node = node.folders[part];
    }
  }

  for (const filePath of Object.keys(files)) {
    const parts = filePath.split("/").filter(Boolean);
    const fileName = parts.pop();
    let node = root;
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!node.folders[part]) {
        node.folders[part] = { name: part, path: currentPath, folders: {}, files: [] };
      }
      node = node.folders[part];
    }
    node.files.push({ name: fileName, path: filePath });
  }

  return root;
}

function renderTreeNodes(node, depth = 0) {
  const fragment = document.createDocumentFragment();

  const folderNames = Object.keys(node.folders).sort((a, b) => a.localeCompare(b));
  for (const fName of folderNames) {
    const folder = node.folders[fName];
    const isExpanded = expandedFolders.has(folder.path);

    const row = document.createElement("div");
    row.className = "tree-row folder-row";
    row.style.paddingLeft = `${8 + depth * 14}px`;

    const left = document.createElement("div");
    left.className = "tree-left";
    left.innerHTML = `
      <span class="tree-caret">${isExpanded ? "▾" : "▸"}</span>
      <span class="tree-icon">${isExpanded ? "📂" : "📁"}</span>
      <span class="file-name">${folder.name}</span>
    `;

    const actions = document.createElement("div");
    actions.className = "tree-row-actions";

    const addInsideBtn = document.createElement("button");
    addInsideBtn.className = "row-mini-btn plus-btn";
    addInsideBtn.textContent = "+";
    addInsideBtn.title = `Folder actions for ${folder.path}`;
    addInsideBtn.onclick = (e) => {
      e.stopPropagation();
      openFolderActionSheet(folder.path);
    };

    const delFolderBtn = document.createElement("button");
    delFolderBtn.className = "row-mini-btn del";
    delFolderBtn.innerHTML = "&times;";
    delFolderBtn.title = `Delete folder ${folder.path}`;
    delFolderBtn.onclick = (e) => {
      e.stopPropagation();
      deleteFolder(folder.path);
    };

    actions.appendChild(addInsideBtn);
    actions.appendChild(delFolderBtn);

    row.appendChild(left);
    row.appendChild(actions);

    row.onclick = () => {
      if (expandedFolders.has(folder.path)) {
        expandedFolders.delete(folder.path);
      } else {
        expandedFolders.add(folder.path);
      }
      renderFileTree();
    };

    fragment.appendChild(row);

    if (isExpanded) {
      fragment.appendChild(renderTreeNodes(folder, depth + 1));
    }
  }

  const priority = ["index.html", "style.css", "script.js"];
  const sortedFiles = [...node.files].sort((a, b) => {
    const idxA = priority.indexOf(a.name);
    const idxB = priority.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const fileObj of sortedFiles) {
    const row = document.createElement("div");
    row.className = `tree-row ${fileObj.path === activeFile ? "active" : ""}`;
    row.style.paddingLeft = `${14 + depth * 14}px`;

    const left = document.createElement("div");
    left.className = "tree-left";
    left.innerHTML = `
      <span class="tree-icon">${getFileIcon(fileObj.name)}</span>
      <span class="file-name">${fileObj.name}</span>
    `;

    const actions = document.createElement("div");
    actions.className = "tree-row-actions";

    const delBtn = document.createElement("button");
    delBtn.className = "row-mini-btn del";
    delBtn.innerHTML = "&times;";
    delBtn.title = "Delete file";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteFile(fileObj.path);
    };

    actions.appendChild(delBtn);
    row.appendChild(left);
    row.appendChild(actions);

    row.onclick = () => {
      openFile(fileObj.path);
      closeMobileSidebar();
    };

    fragment.appendChild(row);
  }

  return fragment;
}

function renderFileTree() {
  fileTreeEl.innerHTML = "";
  const tree = buildTreeStructure();
  fileTreeEl.appendChild(renderTreeNodes(tree, 0));
}

// =========================================================================
// FOLDER '+' BOTTOM ACTION SHEET
// =========================================================================
function openFolderActionSheet(folderPath) {
  sheetTargetFolder = folderPath;
  sheetFolderTitle.textContent = folderPath;
  folderSheetOverlay.classList.remove("hidden");
}

function closeFolderActionSheet() {
  folderSheetOverlay.classList.add("hidden");
}

closeSheetBtn.addEventListener("click", closeFolderActionSheet);
folderSheetOverlay.addEventListener("click", (e) => {
  if (e.target === folderSheetOverlay) closeFolderActionSheet();
});

sheetNewFileBtn.addEventListener("click", () => {
  const folder = sheetTargetFolder;
  closeFolderActionSheet();
  promptCreateFile(`${folder}/`);
});

sheetNewFolderBtn.addEventListener("click", () => {
  const folder = sheetTargetFolder;
  closeFolderActionSheet();
  promptCreateFolder(`${folder}/`);
});

sheetImportZipBtn.addEventListener("click", () => {
  pendingUploadFolder = sheetTargetFolder;
  closeFolderActionSheet();
  zipInput.click();
});

sheetUploadFilesBtn.addEventListener("click", () => {
  pendingUploadFolder = sheetTargetFolder;
  closeFolderActionSheet();
  assetUploadInput.click();
});

sheetExportZipBtn.addEventListener("click", async () => {
  const folder = sheetTargetFolder;
  closeFolderActionSheet();

  const prefix = folder + "/";
  const folderFileEntries = Object.entries(files).filter(([p]) => p.startsWith(prefix));

  if (folderFileEntries.length === 0) {
    await showCozyPopup({
      title: "Empty Folder",
      message: `"${folder}" has no files to export yet.`,
      icon: "📂",
      tone: "warn",
      mode: "alert",
      confirmText: "OK"
    });
    return;
  }

  const zip = new JSZip();
  for (const [path, content] of folderFileEntries) {
    const relativeInside = path.slice(prefix.length);
    if (typeof content === "string" && content.startsWith("data:")) {
      zip.file(relativeInside, content.split(",")[1], { base64: true });
    } else {
      zip.file(relativeInside, content);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeZipName = folder.split("/").pop().replace(/[^a-z0-9_-]/gi, "_") || "folder";
  a.download = `${safeZipName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
});

sheetRenameFolderBtn.addEventListener("click", async () => {
  const oldFolder = sheetTargetFolder;
  closeFolderActionSheet();

  const newName = await showCozyPopup({
    title: "Rename Folder",
    message: "Enter new folder path or name:",
    icon: "✏️",
    tone: "info",
    mode: "prompt",
    placeholder: "e.g. BidBaaz",
    defaultValue: oldFolder,
    confirmText: "Rename",
    cancelText: "Cancel"
  });

  if (!newName) return;
  const cleanNew = newName.trim().replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
  if (!cleanNew || cleanNew === oldFolder) return;

  const oldPrefix = oldFolder + "/";
  const newPrefix = cleanNew + "/";

  const updatedFiles = {};
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith(oldPrefix)) {
      updatedFiles[newPrefix + path.slice(oldPrefix.length)] = content;
    } else {
      updatedFiles[path] = content;
    }
  }
  files = updatedFiles;

  emptyFolders = emptyFolders.map((f) => {
    if (f === oldFolder) return cleanNew;
    if (f.startsWith(oldPrefix)) return newPrefix + f.slice(oldPrefix.length);
    return f;
  });

  if (activeFile.startsWith(oldPrefix)) {
    activeFile = newPrefix + activeFile.slice(oldPrefix.length);
  }

  expandedFolders.delete(oldFolder);
  expandedFolders.add(cleanNew);
  await persistNow();
  openFile(activeFile);
});

// Tap active filename in topbar to rename active file
currentFileNameEl.addEventListener("click", async () => {
  const oldPath = activeFile;
  const newName = await showCozyPopup({
    title: "Rename File",
    message: "Enter new file name:",
    icon: "✏️",
    tone: "info",
    mode: "prompt",
    placeholder: "e.g. index.html",
    defaultValue: oldPath,
    confirmText: "Rename",
    cancelText: "Cancel"
  });

  if (!newName) return;
  const cleanNew = newName.trim().replace(/^\/+/, "").replace(/\/+/g, "/");
  if (!cleanNew || cleanNew === oldPath || cleanNew.endsWith("/")) return;

  if (cleanNew in files) {
    await showCozyPopup({
      title: "Name Taken",
      message: `"${cleanNew}" already exists.`,
      icon: "⚠️",
      tone: "warn",
      mode: "alert",
      confirmText: "OK"
    });
    return;
  }

  files[cleanNew] = files[oldPath];
  delete files[oldPath];
  await persistNow();
  openFile(cleanNew);
});

// =========================================================================
// FILE OPERATIONS & EDITOR
// =========================================================================
function openFile(fileName) {
  if (!(fileName in files)) return;
  activeFile = fileName;
  expandParentsOf(fileName);
  currentFileNameEl.textContent = fileName;
  currentFileNameEl.title = `${fileName} (Tap to rename)`;

  const content = files[fileName];
  assetAudio.pause();
  assetAudio.src = "";

  if (typeof content === "string" && content.startsWith("data:image/")) {
    codeEditor.classList.add("hidden");
    lineNumbers.classList.add("hidden");
    assetPreviewBox.classList.remove("hidden");
    assetImage.classList.remove("hidden");
    assetAudio.classList.add("hidden");
    assetImage.src = content;
    assetInfo.textContent = `Image Asset: ${fileName}`;
  } else if (typeof content === "string" && content.startsWith("data:audio/")) {
    codeEditor.classList.add("hidden");
    lineNumbers.classList.add("hidden");
    assetPreviewBox.classList.remove("hidden");
    assetImage.classList.add("hidden");
    assetAudio.classList.remove("hidden");
    assetAudio.src = content;
    assetInfo.textContent = `Audio Asset: ${fileName}`;
  } else if (typeof content === "string" && content.startsWith("data:")) {
    codeEditor.classList.add("hidden");
    lineNumbers.classList.add("hidden");
    assetPreviewBox.classList.remove("hidden");
    assetImage.classList.add("hidden");
    assetAudio.classList.add("hidden");
    assetInfo.textContent = `Binary Asset: ${fileName}`;
  } else {
    assetPreviewBox.classList.add("hidden");
    codeEditor.classList.remove("hidden");
    lineNumbers.classList.remove("hidden");
    codeEditor.value = content;
    updateLineNumbers();
  }

  renderFileTree();
  saveWorkspace();
}

async function deleteFile(fileName) {
  if (Object.keys(files).length <= 1) {
    await showCozyPopup({
      title: "Cannot Delete",
      message: "At least one file must remain in the project.",
      icon: "🌷",
      tone: "warn",
      mode: "alert",
      confirmText: "Got it"
    });
    return;
  }

  const confirmed = await showCozyPopup({
    title: "Delete File?",
    message: `Are you sure you want to delete "${fileName}"?`,
    icon: "🗑️",
    tone: "danger",
    mode: "confirm",
    confirmText: "Delete",
    cancelText: "Cancel"
  });

  if (!confirmed) return;

  delete files[fileName];
  if (activeFile === fileName) {
    activeFile = findEntryHtml() || Object.keys(files)[0];
  }
  await persistNow();
  openFile(activeFile);
}

async function deleteFolder(folderPath) {
  const prefix = folderPath + "/";
  const insideFiles = Object.keys(files).filter((k) => k.startsWith(prefix));
  const remainingFiles = Object.keys(files).filter((k) => !k.startsWith(prefix));

  if (remainingFiles.length === 0) {
    await showCozyPopup({
      title: "Cannot Delete",
      message: "At least one file must remain outside this folder.",
      icon: "🌷",
      tone: "warn",
      mode: "alert",
      confirmText: "Got it"
    });
    return;
  }

  const confirmed = await showCozyPopup({
    title: "Delete Folder?",
    message: `Delete "${folderPath}" and its ${insideFiles.length} file${insideFiles.length === 1 ? "" : "s"}?`,
    icon: "📂",
    tone: "danger",
    mode: "confirm",
    confirmText: "Delete",
    cancelText: "Cancel"
  });

  if (!confirmed) return;

  for (const f of insideFiles) delete files[f];
  emptyFolders = emptyFolders.filter((f) => f !== folderPath && !f.startsWith(prefix));
  if (!(activeFile in files)) {
    activeFile = findEntryHtml() || Object.keys(files)[0];
  }
  await persistNow();
  openFile(activeFile);
}

function updateLineNumbers() {
  const lines = Math.max(1, codeEditor.value.split("\n").length);
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join("<br>");
}

codeEditor.addEventListener("input", () => {
  files[activeFile] = codeEditor.value;
  saveWorkspace();
  updateLineNumbers();
});

codeEditor.addEventListener("scroll", () => {
  lineNumbers.scrollTop = codeEditor.scrollTop;
});

codeEditor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.substring(0, start) + "  " + codeEditor.value.substring(end);
    codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;
    files[activeFile] = codeEditor.value;
    saveWorkspace();
    updateLineNumbers();
  }
});

async function promptCreateFile(prefix = "") {
  const name = await showCozyPopup({
    title: "New File",
    message: "Enter file name (e.g. index.html, style.css, script.js)",
    icon: "📄",
    tone: "info",
    mode: "prompt",
    placeholder: "e.g. index.html, style.css, script.js",
    defaultValue: prefix,
    confirmText: "Create",
    cancelText: "Cancel"
  });

  if (!name) return;
  const cleanName = name.trim().replace(/^\/+/, "").replace(/\/+/g, "/");
  if (!cleanName || cleanName.endsWith("/")) return;

  if (cleanName in files) {
    await showCozyPopup({
      title: "Already Exists",
      message: `"${cleanName}" is already in your project.`,
      icon: "✨",
      tone: "warn",
      mode: "alert",
      confirmText: "Open File"
    });
    openFile(cleanName);
    closeMobileSidebar();
    return;
  }

  files[cleanName] = "";
  await persistNow();
  openFile(cleanName);
  closeMobileSidebar();
}

async function promptCreateFolder(prefix = "") {
  const name = await showCozyPopup({
    title: "New Folder",
    message: "Enter folder name (e.g. BidBaaz, css, images)",
    icon: "📁",
    tone: "info",
    mode: "prompt",
    placeholder: "e.g. BidBaaz, css, images",
    defaultValue: prefix,
    confirmText: "Create",
    cancelText: "Cancel"
  });

  if (!name) return;
  const cleanFolder = name.trim().replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
  if (!cleanFolder) return;

  if (!emptyFolders.includes(cleanFolder)) {
    emptyFolders.push(cleanFolder);
  }
  expandParentsOf(cleanFolder + "/dummy");
  expandedFolders.add(cleanFolder);
  await persistNow();
  renderFileTree();
}

newFileBtn.addEventListener("click", () => promptCreateFile(""));
newFolderBtn.addEventListener("click", () => promptCreateFolder(""));

resetBtn.addEventListener("click", async () => {
  const confirmed = await showCozyPopup({
    title: "Reset Workspace?",
    message: "This will clear all files and leave empty index.html, style.css, and script.js.",
    icon: "🧹",
    tone: "danger",
    mode: "confirm",
    confirmText: "Reset",
    cancelText: "Cancel"
  });

  if (!confirmed) return;

  files = {
    "index.html": "",
    "style.css": "",
    "script.js": ""
  };
  emptyFolders = [];
  expandedFolders.clear();
  await persistNow();
  openFile("index.html");
});

// =========================================================================
// ZIP IMPORT, MULTI-FILE UPLOAD & PROJECT EXPORT
// =========================================================================
const TEXT_EXTS = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx",
  ".json", ".svg", ".txt", ".md", ".xml", ".csv", ".yml", ".yaml", ".ini", ".env"
]);

function getMimeType(path) {
  const lower = path.toLowerCase();
  const ext = lower.includes(".") ? "." + lower.split(".").pop() : "";
  const map = {
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".bmp": "image/bmp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".eot": "application/vnd.ms-fontobject",
    ".pdf": "application/pdf"
  };
  return map[ext] || "application/octet-stream";
}

function isTextFile(path) {
  const lower = path.toLowerCase();
  const ext = lower.includes(".") ? "." + lower.split(".").pop() : "";
  return TEXT_EXTS.has(ext);
}

zipInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const targetFolder = pendingUploadFolder;
  pendingUploadFolder = "";
  if (!file) return;

  try {
    const zip = await JSZip.loadAsync(file);
    const validPaths = [];

    zip.forEach((relativePath, entry) => {
      const normalized = relativePath.replace(/\\/g, "/");
      if (!entry.dir && !normalized.startsWith("__MACOSX/") && !normalized.endsWith(".DS_Store")) {
        validPaths.push(normalized);
      }
    });

    if (validPaths.length === 0) {
      await showCozyPopup({
        title: "Empty ZIP",
        message: "No valid files were found inside this ZIP archive.",
        icon: "📦",
        tone: "warn",
        mode: "alert",
        confirmText: "OK"
      });
      return;
    }

    let commonPrefix = "";
    const firstParts = validPaths[0].split("/");
    if (firstParts.length > 1) {
      const candidate = firstParts[0] + "/";
      if (validPaths.every((p) => p.startsWith(candidate))) {
        commonPrefix = candidate;
      }
    }

    const folderPrefix = targetFolder ? `${targetFolder}/` : "";
    let addedCount = 0;

    for (const fullPath of validPaths) {
      const cleanPath = commonPrefix ? fullPath.slice(commonPrefix.length) : fullPath;
      if (!cleanPath) continue;

      const destPath = folderPrefix + cleanPath;
      if (isTextFile(cleanPath)) {
        files[destPath] = await zip.file(fullPath).async("string");
      } else {
        const base64 = await zip.file(fullPath).async("base64");
        const mime = getMimeType(cleanPath);
        files[destPath] = `data:${mime};base64,${base64}`;
      }
      addedCount++;
    }

    if (targetFolder) {
      expandedFolders.add(targetFolder);
    }

    const entryHtml = findEntryHtml(targetFolder) || Object.keys(files)[0];
    activeFile = entryHtml;
    await persistNow();
    openFile(entryHtml);

    await showCozyPopup({
      title: "ZIP Imported",
      message: targetFolder
        ? `Saved ${addedCount} file${addedCount === 1 ? "" : "s"} into "${targetFolder}/".`
        : `Loaded ${addedCount} file${addedCount === 1 ? "" : "s"}.`,
      icon: "🎉",
      tone: "info",
      mode: "alert",
      confirmText: "Awesome"
    });
  } catch (err) {
    await showCozyPopup({
      title: "Import Error",
      message: "Could not read ZIP file: " + err.message,
      icon: "⚠️",
      tone: "danger",
      mode: "alert",
      confirmText: "OK"
    });
  } finally {
    zipInput.value = "";
  }
});

assetUploadInput.addEventListener("change", async (e) => {
  const selectedFiles = Array.from(e.target.files || []);
  const targetFolder = pendingUploadFolder;
  pendingUploadFolder = "";
  if (selectedFiles.length === 0) return;

  const folderPrefix = targetFolder ? `${targetFolder}/` : "";
  let lastAddedPath = "";

  for (const f of selectedFiles) {
    const destPath = folderPrefix + f.name;
    if (isTextFile(f.name)) {
      files[destPath] = await f.text();
    } else {
      files[destPath] = await readFileAsDataURL(f);
    }
    lastAddedPath = destPath;
  }

  if (targetFolder) {
    expandedFolders.add(targetFolder);
  }
  if (lastAddedPath) activeFile = lastAddedPath;
  await persistNow();
  if (lastAddedPath) openFile(lastAddedPath);

  await showCozyPopup({
    title: "Files Added",
    message: `Saved ${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}${targetFolder ? ` to "${targetFolder}/"` : ""}.`,
    icon: "📎",
    tone: "info",
    mode: "alert",
    confirmText: "Done"
  });

  assetUploadInput.value = "";
});

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

exportZipBtn.addEventListener("click", async () => {
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    if (typeof content === "string" && content.startsWith("data:")) {
      const base64Data = content.split(",")[1];
      zip.file(path, base64Data, { base64: true });
    } else {
      zip.file(path, content);
    }
  }

  for (const folder of emptyFolders) {
    zip.folder(folder);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pikaedit-project.zip";
  a.click();
  URL.revokeObjectURL(url);
});

// =========================================================================
// LIVE RUNNER & VIRTUAL FILE SYSTEM
// =========================================================================
function resolvePath(baseFile, targetPath) {
  if (!targetPath) return null;
  const trimmed = targetPath.trim();
  if (/^(https?:|data:|blob:|#|mailto:|tel:|javascript:)/i.test(trimmed)) return null;

  const cleanTarget = trimmed.split("?")[0].split("#")[0].replace(/\\/g, "/");
  if (!cleanTarget) return null;

  const baseParts = baseFile.split("/");
  baseParts.pop();

  const workingParts = cleanTarget.startsWith("/") ? [] : baseParts;
  const targetParts = cleanTarget.replace(/^\/+/, "").split("/");

  for (const part of targetParts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (workingParts.length > 0) workingParts.pop();
    } else {
      workingParts.push(part);
    }
  }
  return workingParts.join("/");
}

function lookupAssetUrl(resolvedPath, assetMap) {
  if (!resolvedPath) return null;
  if (assetMap[resolvedPath]) return assetMap[resolvedPath];
  const lower = resolvedPath.toLowerCase();
  const foundKey = Object.keys(assetMap).find((k) => k.toLowerCase() === lower);
  return foundKey ? assetMap[foundKey] : null;
}

function rewriteCssContent(cssText, cssFilePath, assetMap) {
  let rewritten = cssText.replace(/url\(\s*(['"]?)([^'"()]+)\1\s*\)/gi, (match, quote, rawUrl) => {
    const resolved = resolvePath(cssFilePath, rawUrl);
    const mapped = lookupAssetUrl(resolved, assetMap);
    if (mapped) return `url("${mapped}")`;
    return match;
  });

  rewritten = rewritten.replace(/@import\s+(['"])([^'"]+)\1/gi, (match, quote, rawUrl) => {
    const resolved = resolvePath(cssFilePath, rawUrl);
    const mapped = lookupAssetUrl(resolved, assetMap);
    if (mapped) return `@import "${mapped}"`;
    return match;
  });

  return rewritten;
}

function revokePreviousBlobs() {
  for (const url of activeBlobUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {}
  }
  activeBlobUrls = [];
}

function createTrackedBlobUrl(content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  activeBlobUrls.push(url);
  return url;
}

function findContextualHtml() {
  if (activeFile.toLowerCase().endsWith(".html")) return activeFile;

  const parts = activeFile.split("/");
  parts.pop();
  while (parts.length > 0) {
    const folder = parts.join("/");
    const found = findEntryHtml(folder);
    if (found) return found;
    parts.pop();
  }
  return findEntryHtml("");
}

async function runProject(overrideHtmlFile = null) {
  clearConsole();
  revokePreviousBlobs();

  const targetHtmlFile =
    (overrideHtmlFile && files[overrideHtmlFile] !== undefined ? overrideHtmlFile : null) ||
    findContextualHtml();

  if (!targetHtmlFile) {
    await showCozyPopup({
      title: "No HTML File",
      message: "Please create or select an .html file to run your project.",
      icon: "📄",
      tone: "warn",
      mode: "alert",
      confirmText: "OK"
    });
    return;
  }

  previewTitle.textContent = targetHtmlFile;

  const assetMap = {};
  for (const [path, content] of Object.entries(files)) {
    if (path.toLowerCase().endsWith(".css")) continue;
    if (typeof content === "string" && content.startsWith("data:")) {
      assetMap[path] = content;
    } else {
      assetMap[path] = createTrackedBlobUrl(content, getMimeType(path));
    }
  }

  for (const [path, content] of Object.entries(files)) {
    if (!path.toLowerCase().endsWith(".css")) continue;
    const rewrittenCss = rewriteCssContent(content, path, assetMap);
    assetMap[path] = createTrackedBlobUrl(rewrittenCss, "text/css");
  }

  let htmlContent = files[targetHtmlFile];

  htmlContent = htmlContent.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, cssBody) => {
    const rewrittenInline = rewriteCssContent(cssBody, targetHtmlFile, assetMap);
    return `<style${attrs}>${rewrittenInline}</style>`;
  });

  htmlContent = htmlContent.replace(
    /\b(src|href|poster|data)\s*=\s*(["'])([^"']+)\2/gi,
    (match, attr, quote, rawPath) => {
      const resolved = resolvePath(targetHtmlFile, rawPath);
      if (!resolved) return match;

      if (attr.toLowerCase() === "href" && resolved.toLowerCase().endsWith(".html")) {
        return match;
      }

      const mapped = lookupAssetUrl(resolved, assetMap);
      if (mapped) {
        return `${attr}=${quote}${mapped}${quote}`;
      }
      return match;
    }
  );

  htmlContent = htmlContent.replace(/\bsrcset\s*=\s*(["'])([^"']+)\1/gi, (match, quote, srcsetVal) => {
    const rewrittenSet = srcsetVal
      .split(",")
      .map((item) => {
        const parts = item.trim().split(/\s+/);
        if (!parts[0]) return item;
        const resolved = resolvePath(targetHtmlFile, parts[0]);
        const mapped = lookupAssetUrl(resolved, assetMap);
        if (mapped) parts[0] = mapped;
        return parts.join(" ");
      })
      .join(", ");
    return `srcset=${quote}${rewrittenSet}${quote}`;
  });

  const vfsPayload = JSON.stringify({
    baseFile: targetHtmlFile,
    assets: assetMap
  });

  const runtimeHook = `
  <script>
    (function() {
      const VFS = ${vfsPayload};

      function resolveVfsPath(raw) {
        if (!raw || typeof raw !== 'string') return null;
        const trimmed = raw.trim();
        if (/^(https?:|data:|blob:|#|mailto:|tel:|javascript:)/i.test(trimmed)) return null;
        const clean = trimmed.split('?')[0].split('#')[0].replace(/\\/g, '/');
        if (!clean) return null;
        const baseParts = VFS.baseFile.split('/');
        baseParts.pop();
        const work = clean.startsWith('/') ? [] : baseParts;
        const parts = clean.replace(/^\/+/, '').split('/');
        for (const p of parts) {
          if (p === '.' || p === '') continue;
          if (p === '..') { if (work.length > 0) work.pop(); }
          else { work.push(p); }
        }
        const resolved = work.join('/');
        if (VFS.assets[resolved]) return VFS.assets[resolved];
        const lower = resolved.toLowerCase();
        const key = Object.keys(VFS.assets).find(k => k.toLowerCase() === lower);
        return key ? VFS.assets[key] : null;
      }

      const origFetch = window.fetch;
      if (origFetch) {
        window.fetch = function(input, init) {
          if (typeof input === 'string') {
            const mapped = resolveVfsPath(input);
            if (mapped) input = mapped;
          }
          return origFetch.call(this, input, init);
        };
      }

      const origXhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        if (typeof url === 'string') {
          const mapped = resolveVfsPath(url);
          if (mapped) arguments[1] = mapped;
        }
        return origXhrOpen.apply(this, arguments);
      };

      const OrigAudio = window.Audio;
      if (OrigAudio) {
        window.Audio = function(src) {
          const mapped = resolveVfsPath(src);
          return new OrigAudio(mapped || src);
        };
        window.Audio.prototype = OrigAudio.prototype;
      }

      function hookSrcProperty(Proto) {
        if (!Proto) return;
        const desc = Object.getOwnPropertyDescriptor(Proto, 'src');
        if (desc && desc.set) {
          Object.defineProperty(Proto, 'src', {
            get: desc.get,
            set: function(val) {
              const mapped = resolveVfsPath(val);
              return desc.set.call(this, mapped || val);
            },
            configurable: true
          });
        }
      }
      hookSrcProperty(HTMLImageElement.prototype);
      hookSrcProperty(HTMLMediaElement.prototype);
      hookSrcProperty(HTMLScriptElement.prototype);
      hookSrcProperty(HTMLSourceElement.prototype);

      const origSetAttr = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name, val) {
        if (typeof name === 'string' && /^(src|href)$/i.test(name) && typeof val === 'string') {
          const mapped = resolveVfsPath(val);
          if (mapped) val = mapped;
        }
        return origSetAttr.call(this, name, val);
      };

      document.addEventListener('click', function(e) {
        const anchor = e.target.closest ? e.target.closest('a[href]') : null;
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return;
        if (href.split('?')[0].split('#')[0].toLowerCase().endsWith('.html')) {
          e.preventDefault();
          window.parent.postMessage({
            source: 'pikaedit-navigate',
            from: VFS.baseFile,
            to: href
          }, '*');
        }
      });

      const send = (type, args) => {
        try {
          const formatted = Array.from(args).map(a => {
            if (a instanceof Error) return a.name + ': ' + a.message;
            if (typeof a === 'object' && a !== null) return JSON.stringify(a);
            return String(a);
          }).join(' ');
          window.parent.postMessage({ source: 'pikaedit-console', type, message: formatted }, '*');
        } catch(e) {}
      };
      const origLog = console.log;
      const origWarn = console.warn;
      const origError = console.error;
      console.log = function() { send('info', arguments); origLog.apply(console, arguments); };
      console.warn = function() { send('warn', arguments); origWarn.apply(console, arguments); };
      console.error = function() { send('error', arguments); origError.apply(console, arguments); };
      window.onerror = function(msg, src, line) {
        send('error', [msg + ' (Line ' + line + ')']);
      };
    })();
  <\/script>`;

  if (/<head[^>]*>/i.test(htmlContent)) {
    htmlContent = htmlContent.replace(/<head[^>]*>/i, (match) => match + runtimeHook);
  } else {
    htmlContent = runtimeHook + htmlContent;
  }

  previewFrame.srcdoc = htmlContent;
  previewModal.classList.remove("hidden");
}

runBtn.addEventListener("click", () => runProject());
reloadPreviewBtn.addEventListener("click", () => runProject());

closePreviewBtn.addEventListener("click", () => {
  exitAppFullscreen();
  previewModal.classList.add("hidden");
  previewFrame.srcdoc = "";
  revokePreviousBlobs();
});

window.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.source === "pikaedit-console") {
    appendConsoleLog(event.data.type, event.data.message);
  } else if (event.data.source === "pikaedit-navigate") {
    const targetPath = resolvePath(event.data.from, event.data.to);
    if (targetPath && files[targetPath] !== undefined) {
      runProject(targetPath);
    } else {
      appendConsoleLog("warn", `Page not found: ${event.data.to}`);
    }
  }
});

function appendConsoleLog(type, text) {
  logCount++;
  consoleBadge.textContent = logCount;
  const div = document.createElement("div");
  div.className = `log-line log-${type}`;
  div.textContent = `> ${text}`;
  consoleLogs.appendChild(div);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function clearConsole() {
  logCount = 0;
  consoleBadge.textContent = "0";
  consoleLogs.innerHTML = "";
}

consoleToggleBtn.addEventListener("click", () => {
  consolePanel.classList.toggle("hidden");
});

clearConsoleBtn.addEventListener("click", clearConsole);

// Mobile Drawer Controls
function closeMobileSidebar() {
  sidebar.classList.remove("open");
  sidebarBackdrop.classList.remove("show");
}

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarBackdrop.classList.toggle("show");
});

sidebarBackdrop.addEventListener("click", closeMobileSidebar);

// =========================================================================
// BOOTSTRAP WORKSPACE FROM INDEXEDDB
// =========================================================================
(async function initWorkspace() {
  const savedFiles = await idbGet("files");
  const savedFolders = await idbGet("folders");
  const savedActive = await idbGet("activeFile");

  if (savedFiles && typeof savedFiles === "object" && Object.keys(savedFiles).length > 0) {
    files = savedFiles;
  } else {
    // Migrate legacy localStorage data if available
    try {
      const legacyFolders = window.localStorage.getItem(FOLDERS_KEY);
      if (legacyFolders) emptyFolders = JSON.parse(legacyFolders);
    } catch (e) {}
    await persistNow();
  }

  if (Array.isArray(savedFolders)) {
    emptyFolders = savedFolders;
  }

  if (savedActive && savedActive in files) {
    activeFile = savedActive;
  } else {
    activeFile = findEntryHtml() || Object.keys(files)[0] || "index.html";
  }

  expandParentsOf(activeFile);
  openFile(activeFile);
})();
