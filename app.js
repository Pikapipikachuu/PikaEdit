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

const STORAGE_KEY = "codebox_project_files_v1";
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

// Load from localStorage or fallback to default
function loadSavedFiles() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Object.keys(parsed).length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Could not load saved workspace:", e);
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

// Render File Explorer
function renderFileList() {
  fileListEl.innerHTML = "";
  const sortedNames = Object.keys(files).sort((a, b) => a.localeCompare(b));

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
function deleteFile(fileName) {
  if (Object.keys(files).length <= 1) {
    alert("Kam se kam ek file project me honi chahiye.");
    return;
  }
  if (!confirm(`Delete "${fileName}"?`)) return;

  delete files[fileName];
  saveFiles();

  if (activeFile === fileName) {
    activeFile = Object.keys(files)[0];
  }
  openFile(activeFile);
}

// Update Line Numbers
function updateLineNumbers() {
  const lines = codeEditor.value.split("\n").length;
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
newFileBtn.addEventListener("click", () => {
  const name = prompt("Enter file name (e.g. about.html, app.js, css/main.css):");
  if (!name) return;
  const cleanName = name.trim().replace(/^\/+/, "");
  if (!cleanName) return;

  if (cleanName in files) {
    alert("Ye file pehle se exist karti hai!");
    openFile(cleanName);
    return;
  }

  files[cleanName] = "";
  saveFiles();
  openFile(cleanName);
  closeMobileSidebar();
});

// Reset to Starter Project
resetBtn.addEventListener("click", () => {
  if (!confirm("Reset project to default template? Current changes will be cleared.")) return;
  files = { ...DEFAULT_FILES };
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
      alert("Is ZIP file me koi valid files nahi mili.");
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

    // Open index.html if available, otherwise first HTML file, otherwise first file
    const allKeys = Object.keys(files);
    const entryHtml =
      allKeys.find((k) => k.toLowerCase() === "index.html") ||
      allKeys.find((k) => k.toLowerCase().endsWith(".html")) ||
      allKeys[0];

    openFile(entryHtml);
    alert(`ZIP imported! (${allKeys.length} files loaded)`);
  } catch (err) {
    alert("ZIP read karne me error aaya: " + err.message);
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
  baseParts.pop(); // remove current file name

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
function runProject() {
  clearConsole();

  // Decide which HTML file to run
  const targetHtmlFile = activeFile.toLowerCase().endsWith(".html")
    ? activeFile
    : Object.keys(files).find((k) => k.toLowerCase() === "index.html") ||
      Object.keys(files).find((k) => k.toLowerCase().endsWith(".html"));

  if (!targetHtmlFile) {
    alert("Run karne ke liye project me kam se kam ek .html file honi chahiye!");
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
          const formatted = Array.from(args).map(a =>
            typeof a === 'object' ? JSON.stringify(a) : String(a)
          ).join(' ');
          window.parent.postMessage({ source: 'codebox-console', type, message: formatted }, '*');
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
  if (event.data && event.data.source === "codebox-console") {
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
