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
    <p>Edit this code or import any .zip file from the top bar.</p>
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

const STORAGE_KEY = "pikaedit_project_files_v1";
let files = loadSavedFiles();
let activeFile = Object.keys(files)[0] || "index.html";
let logCount = 0;

// DOM Elements
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const menuBtn = document.getElementById("menuBtn");
const fileListEl = document.getElementById("fileList");
const currentFileNameEl = document.getElementById("currentFileName");
const codeEditor = document.getElementById("codeEditor");
const lineNumbers = document.getElementById("lineNumbers");
const imagePreviewBox = document.getElementById("imagePreviewBox");
const assetImage = document.getElementById("assetImage");
const assetInfo = document.getElementById("assetInfo");

const zipInput = document.getElementById("zipInput");
const exportZipBtn = document.getElementById("exportZipBtn");
const newFileBtn = document.getElementById("newFileBtn");
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

// Ensure Cozy Popup DOM & Styles exist even if index.html/style.css wasn't updated yet
function ensureCozyPopupReady() {
  if (!document.getElementById("cozyFallbackStyles")) {
    const st = document.createElement("style");
    st.id = "cozyFallbackStyles";
    st.textContent = `
      .cozy-overlay{position:fixed;inset:0;background:rgba(11,13,17,.65);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px}
      .cozy-overlay.hidden,.cozy-input.hidden,.cozy-btn.hidden{display:none!important}
      .cozy-card{width:min(84vw,276px);background:#20232c;border:1px solid #323746;border-radius:20px;padding:18px 16px 15px;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.55);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
      .cozy-icon{width:38px;height:38px;margin:0 auto 10px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(16,185,129,.15)}
      .cozy-icon.danger{background:rgba(244,63,94,.15)}
      .cozy-icon.warn{background:rgba(251,191,36,.15)}
      .cozy-title{font-size:14.5px;font-weight:700;color:#f3f4f6;margin:0 0 5px}
      .cozy-message{font-size:12.5px;line-height:1.45;color:#9ca3af;margin:0 0 14px;word-break:break-word}
      .cozy-input{width:100%;box-sizing:border-box;background:#15171e;border:1px solid #353b4b;border-radius:11px;padding:9px 11px;color:#f3f4f6;font-size:12.5px;outline:none;margin-bottom:14px}
      .cozy-actions{display:flex;gap:8px}
      .cozy-btn{flex:1;padding:8px 12px;border-radius:11px;font-size:12.5px;font-weight:600;border:none;cursor:pointer}
      .cozy-btn.cancel{background:#2b303c;color:#cbd5e1}
      .cozy-btn.confirm{background:#10b981;color:#052e16}
      .cozy-btn.confirm.danger{background:#fb7185;color:#2b0710}
    `;
    document.head.appendChild(st);
  }
  if (!document.getElementById("cozyModalOverlay")) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div id="cozyModalOverlay" class="cozy-overlay hidden" role="dialog" aria-modal="true">
        <div class="cozy-card">
          <div id="cozyIcon" class="cozy-icon info">✨</div>
          <h3 id="cozyTitle" class="cozy-title">Notice</h3>
          <p id="cozyMessage" class="cozy-message"></p>
          <input type="text" id="cozyInput" class="cozy-input hidden" spellcheck="false" autocapitalize="off" autocomplete="off" />
          <div class="cozy-actions">
            <button id="cozyCancelBtn" class="cozy-btn cancel">Cancel</button>
            <button id="cozyConfirmBtn" class="cozy-btn confirm">OK</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
  }
}
ensureCozyPopupReady();

// Cozy Popup Elements
const cozyModalOverlay = document.getElementById("cozyModalOverlay");
const cozyIcon = document.getElementById("cozyIcon");
const cozyTitle = document.getElementById("cozyTitle");
const cozyMessage = document.getElementById("cozyMessage");
const cozyInput = document.getElementById("cozyInput");
const cozyCancelBtn = document.getElementById("cozyCancelBtn");
const cozyConfirmBtn = document.getElementById("cozyConfirmBtn");

// Custom Cozy Dialog Helper (replaces browser alert, confirm, prompt)
function showCozyPopup({
  title = "Notice",
  message = "",
  icon = "✨",
  tone = "info",
  mode = "alert",
  placeholder = "",
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
      cozyInput.value = "";
      cozyInput.placeholder = placeholder;
    } else {
      cozyInput.classList.add("hidden");
    }

    cozyModalOverlay.classList.remove("hidden");

    if (mode === "prompt") {
      setTimeout(() => cozyInput.focus(), 40);
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
      if (mode === "prompt") {
        cleanup(cozyInput.value);
      } else {
        cleanup(true);
      }
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

// Load from localStorage or fallback to default
function loadSavedFiles() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Object.keys(parsed).length > 0) return parsed;
    }
  } catch (e) {
    // Sandboxed preview or blocked storage: safely fallback to default files
  }
  return { ...DEFAULT_FILES };
}

function saveFiles() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    // Ignore storage quota errors for very large ZIPs
  }
}

// Sort files keeping index.html, style.css, script.js first in clean order
function getSortedFileNames() {
  const priority = ["index.html", "style.css", "script.js"];
  return Object.keys(files).sort((a, b) => {
    const idxA = priority.indexOf(a);
    const idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Render File Explorer
function renderFileList() {
  fileListEl.innerHTML = "";
  const sortedNames = getSortedFileNames();

  sortedNames.forEach((fileName) => {
    const li = document.createElement("li");
    li.className = `file-item ${fileName === activeFile ? "active" : ""}`;

    const span = document.createElement("span");
    span.className = "file-name";
    span.textContent = fileName;
    span.onclick = () => {
      openFile(fileName);
      closeMobileSidebar();
    };

    const delBtn = document.createElement("button");
    delBtn.className = "delete-file-btn";
    delBtn.innerHTML = "&times;";
    delBtn.title = "Delete file";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteFile(fileName);
    };

    li.appendChild(span);
    li.appendChild(delBtn);
    fileListEl.appendChild(li);
  });
}

// Open a File in Editor
function openFile(fileName) {
  if (!(fileName in files)) return;
  activeFile = fileName;
  currentFileNameEl.textContent = fileName;
  const content = files[fileName];

  if (typeof content === "string" && content.startsWith("data:image/")) {
    codeEditor.classList.add("hidden");
    lineNumbers.classList.add("hidden");
    imagePreviewBox.classList.remove("hidden");
    assetImage.src = content;
    assetInfo.textContent = `Image Asset: ${fileName}`;
  } else {
    imagePreviewBox.classList.add("hidden");
    codeEditor.classList.remove("hidden");
    lineNumbers.classList.remove("hidden");
    codeEditor.value = content;
    updateLineNumbers();
  }

  renderFileList();
}

// Delete a File
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
  saveFiles();

  if (activeFile === fileName) {
    activeFile = getSortedFileNames()[0];
  }
  openFile(activeFile);
}

// Update Line Numbers
function updateLineNumbers() {
  const lines = Math.max(1, codeEditor.value.split("\n").length);
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join("<br>");
}

codeEditor.addEventListener("input", () => {
  files[activeFile] = codeEditor.value;
  saveFiles();
  updateLineNumbers();
});

codeEditor.addEventListener("scroll", () => {
  lineNumbers.scrollTop = codeEditor.scrollTop;
});

// Support Tab Indentation in Editor
codeEditor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.substring(0, start) + "  " + codeEditor.value.substring(end);
    codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;
    files[activeFile] = codeEditor.value;
    saveFiles();
    updateLineNumbers();
  }
});

// Create New File
newFileBtn.addEventListener("click", async () => {
  const name = await showCozyPopup({
    title: "New File",
    message: "Enter file name (e.g. index.html, style.css, script.js)",
    icon: "📄",
    tone: "info",
    mode: "prompt",
    placeholder: "e.g. index.html, style.css, script.js",
    confirmText: "Create",
    cancelText: "Cancel"
  });

  if (!name) return;
  const cleanName = name.trim().replace(/^\/+/, "");
  if (!cleanName) return;

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
  saveFiles();
  openFile(cleanName);
  closeMobileSidebar();
});

// Reset to Blank 3-File Workspace (index.html, style.css, script.js)
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
  saveFiles();
  openFile("index.html");
});

// Import & Extract ZIP File
zipInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const zip = await JSZip.loadAsync(file);
    const extracted = {};
    const validPaths = [];

    zip.forEach((relativePath, entry) => {
      if (!entry.dir && !relativePath.startsWith("__MACOSX") && !relativePath.endsWith(".DS_Store")) {
        validPaths.push(relativePath);
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

    // Strip common root folder if the whole project was zipped inside one folder
    let commonPrefix = "";
    const firstParts = validPaths[0].split("/");
    if (firstParts.length > 1) {
      const candidate = firstParts[0] + "/";
      if (validPaths.every((p) => p.startsWith(candidate))) {
        commonPrefix = candidate;
      }
    }

    const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"];

    for (const fullPath of validPaths) {
      const cleanPath = commonPrefix ? fullPath.slice(commonPrefix.length) : fullPath;
      const lower = cleanPath.toLowerCase();
      const isImage = imageExts.some((ext) => lower.endsWith(ext));

      if (isImage) {
        const blob = await zip.file(fullPath).async("blob");
        extracted[cleanPath] = await blobToDataURL(blob);
      } else {
        extracted[cleanPath] = await zip.file(fullPath).async("string");
      }
    }

    files = extracted;
    saveFiles();

    const allKeys = getSortedFileNames();
    const entryHtml =
      allKeys.find((k) => k.toLowerCase() === "index.html") ||
      allKeys.find((k) => k.toLowerCase().endsWith(".html")) ||
      allKeys[0];

    openFile(entryHtml);
    await showCozyPopup({
      title: "ZIP Imported",
      message: `Successfully loaded ${allKeys.length} file${allKeys.length === 1 ? "" : "s"}.`,
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

function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Export Edited Project as ZIP
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

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pikaedit-project.zip";
  a.click();
  URL.revokeObjectURL(url);
});

// Resolve relative paths (e.g. "./css/style.css" or "../script.js")
function resolvePath(baseFile, targetPath) {
  if (/^(https?:|data:|blob:|#|mailto:|tel:)/i.test(targetPath)) return null;
  const cleanTarget = targetPath.split("?")[0].split("#")[0];
  const baseParts = baseFile.split("/");
  baseParts.pop();

  const targetParts = cleanTarget.split("/");
  for (const part of targetParts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  return baseParts.join("/");
}

// Build & Run Project in Isolated Iframe
async function runProject() {
  clearConsole();

  const targetHtmlFile = activeFile.toLowerCase().endsWith(".html")
    ? activeFile
    : Object.keys(files).find((k) => k.toLowerCase() === "index.html") ||
      Object.keys(files).find((k) => k.toLowerCase().endsWith(".html"));

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

  // Create Blob URLs for CSS, JS, and Assets
  const blobMap = {};
  for (const [path, content] of Object.entries(files)) {
    if (typeof content === "string" && content.startsWith("data:")) {
      blobMap[path] = content;
    } else {
      let mime = "text/plain";
      if (path.endsWith(".css")) mime = "text/css";
      else if (path.endsWith(".js")) mime = "application/javascript";
      else if (path.endsWith(".html")) mime = "text/html";
      else if (path.endsWith(".svg")) mime = "image/svg+xml";
      else if (path.endsWith(".json")) mime = "application/json";

      const blob = new Blob([content], { type: mime });
      blobMap[path] = URL.createObjectURL(blob);
    }
  }

  let htmlContent = files[targetHtmlFile];

  // Replace relative src="..." and href="..." with generated Blob URLs
  htmlContent = htmlContent.replace(/(src|href)\s*=\s*(["'])([^"']+)\2/gi, (match, attr, quote, rawPath) => {
    const resolved = resolvePath(targetHtmlFile, rawPath);
    if (resolved && blobMap[resolved]) {
      return `${attr}=${quote}${blobMap[resolved]}${quote}`;
    }
    return match;
  });

  // Inject Console Interceptor Script
  const consoleHook = `
  <script>
    (function() {
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

  if (htmlContent.includes("<head>")) {
    htmlContent = htmlContent.replace("<head>", "<head>" + consoleHook);
  } else {
    htmlContent = consoleHook + htmlContent;
  }

  previewFrame.srcdoc = htmlContent;
  previewModal.classList.remove("hidden");
}

runBtn.addEventListener("click", runProject);
reloadPreviewBtn.addEventListener("click", runProject);

closePreviewBtn.addEventListener("click", () => {
  previewModal.classList.add("hidden");
  previewFrame.srcdoc = "";
});

// Console Message Listener
window.addEventListener("message", (event) => {
  if (event.data && event.data.source === "pikaedit-console") {
    appendConsoleLog(event.data.type, event.data.message);
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

// Initialize App
openFile(activeFile);



