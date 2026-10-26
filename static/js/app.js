/**
 * Bildstudio Pro - 100% Klientbaserad Bildredigerare & Formatkonverterare
 * Fungerar i alla moderna webbläsare på Mac, Windows, Linux, iOS & Android.
 * Inga bilder skickas till någon extern server - 100% privat och blixtsnabbt.
 */

// ==========================================================================
// GLOBALT TILLSTÅND (STATE)
// ==========================================================================
let currentFile = null;
let currentImageInfo = null; // { filename, format, width, height, fileSize, objectUrl }
let cropper = null;
let currentRotation = 0;
let flipH = false;
let aspectLocked = true;
let targetFormat = 'JPEG';
let quality = 85;
let debounceTimer = null;
let lastProcessedBlob = null;

// Batch State
let batchFiles = [];
let isBatchRunning = false;

// DOM Element
const dropzoneArea = document.getElementById('dropzoneArea');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const editorWorkspace = document.getElementById('editorWorkspace');
const imageElement = document.getElementById('imageElement');

// Sidebar Inputs
const targetWidthInput = document.getElementById('targetWidth');
const targetHeightInput = document.getElementById('targetHeight');
const aspectLockBtn = document.getElementById('aspectLockBtn');
const qualitySlider = document.getElementById('qualitySlider');
const qualityBubble = document.getElementById('qualityBubble');
const qualityGuideText = document.getElementById('qualityGuideText');
const customFilenameInput = document.getElementById('customFilename');
const exportExtLabel = document.getElementById('exportExtLabel');
const btnDownload = document.getElementById('btnDownload');

// Stats Elements
const statusFilename = document.getElementById('statusFilename');
const statusFormat = document.getElementById('statusFormat');
const statusOrigDim = document.getElementById('statusOrigDim');
const statusCropDim = document.getElementById('statusCropDim');
const statusOrigSize = document.getElementById('statusOrigSize');
const statFinalRes = document.getElementById('statFinalRes');
const statFinalSize = document.getElementById('statFinalSize');
const statSavings = document.getElementById('statSavings');

// ==========================================================================
// INITIALISERING
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    setupClipboardPaste();
    setupEventListeners();
    setupBatchDropzone();
    updateFormatUI();
});

// Toast Notiser
function showToast(msg, isSuccess = true) {
    const toast = document.getElementById('toastNotification');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastIcon || !toastMessage) return;

    toastMessage.textContent = msg;
    toastIcon.textContent = isSuccess ? '✓' : '!';
    toastIcon.style.background = isSuccess ? 'var(--accent-emerald)' : 'var(--accent-rose)';

    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3800);
}

// Flikbyte (Enskild bildredigerare vs Masskonvertering)
function switchTab(tab) {
    const singleTabBtn = document.getElementById('tabSingleBtn');
    const batchTabBtn = document.getElementById('tabBatchBtn');
    const singleView = document.getElementById('singleView');
    const batchView = document.getElementById('batchView');

    if (tab === 'single') {
        singleTabBtn.classList.add('active');
        batchTabBtn.classList.remove('active');
        singleView.classList.add('active');
        batchView.classList.remove('active');
    } else {
        batchTabBtn.classList.add('active');
        singleTabBtn.classList.remove('active');
        batchView.classList.add('active');
        singleView.classList.remove('active');
    }
}

// Hjälpfunktion för att formatera filstorlekar
function formatFileSize(bytes) {
    if (bytes == null || isNaN(bytes)) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Detektera format utifrån filändelse eller mimetype
function detectFormat(file) {
    const ext = file.name.split('.').pop().toUpperCase();
    if (ext === 'JPG' || ext === 'JPEG' || file.type === 'image/jpeg') return 'JPEG';
    if (ext === 'PNG' || file.type === 'image/png') return 'PNG';
    if (ext === 'WEBP' || file.type === 'image/webp') return 'WEBP';
    if (ext === 'BMP' || file.type === 'image/bmp') return 'BMP';
    if (ext === 'HEIC' || ext === 'HEIF' || file.type === 'image/heic' || file.type === 'image/heif') return 'HEIC';
    return ext || 'BILD';
}

// ==========================================================================
// DRAG & DROP & UPP-LADDNING (Enskild bild)
// ==========================================================================
function setupDragAndDrop() {
    ['dragenter', 'dragover'].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        if (document.getElementById('singleView').classList.contains('active')) {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        }
    });
}

// Klistra in från Urklipp (Ctrl+V på PC, Cmd+V på Mac)
function setupClipboardPaste() {
    window.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const namedFile = new File([blob], `skarmklipp_${Date.now()}.png`, { type: blob.type });
                    handleFileUpload(namedFile);
                    showToast('Bild inklistrad från urklipp!');
                    break;
                }
            }
        }
    });
}

// Hantera inläsning av bild (inklusive Apple HEIC)
async function handleFileUpload(file) {
    if (!file) return;

    showToast('Laddar och förbereder bild...', true);

    const isHeic = file.name.match(/\.(heic|heif)$/i) || file.type.includes('heic') || file.type.includes('heif');
    let displayBlob = file;

    if (isHeic) {
        if (typeof heic2any === 'function') {
            try {
                showToast('Avkodar Apple HEIC-bild direkt i webbläsaren...', true);
                const converted = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.95
                });
                displayBlob = Array.isArray(converted) ? converted[0] : converted;
            } catch (err) {
                console.error('HEIC-konverteringsfel:', err);
                showToast('Kunde inte läsa HEIC-fil: ' + (err.message || 'Okänt format'), false);
                return;
            }
        } else {
            showToast('HEIC-avkodare inte tillgänglig. Använd JPG/PNG/WebP.', false);
            return;
        }
    }

    const objectUrl = URL.createObjectURL(displayBlob);
    const imgTest = new Image();

    imgTest.onload = () => {
        const width = imgTest.naturalWidth;
        const height = imgTest.naturalHeight;

        if (currentImageInfo && currentImageInfo.objectUrl) {
            URL.revokeObjectURL(currentImageInfo.objectUrl);
        }

        currentFile = file;
        currentImageInfo = {
            filename: file.name,
            format: detectFormat(file),
            width: width,
            height: height,
            fileSize: file.size,
            objectUrl: objectUrl
        };

        currentRotation = 0;
        flipH = false;

        // Uppdatera statusfältet
        statusFilename.textContent = file.name;
        statusFormat.textContent = currentImageInfo.format;
        statusOrigDim.textContent = `${width} × ${height} px`;
        statusCropDim.textContent = `${width} × ${height} px`;
        statusOrigSize.textContent = formatFileSize(file.size);

        // Standardnamn vid sparning
        const lastDot = file.name.lastIndexOf('.');
        const base = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
        customFilenameInput.value = `${base}_optimerad`;

        // Byt vy till redigeraren
        dropzoneArea.classList.add('hidden');
        editorWorkspace.classList.remove('hidden');

        // Initiera beskärningsverktyget
        initCropper(objectUrl);
        showToast('Bild inläst!', true);
    };

    imgTest.onerror = () => {
        showToast('Kunde inte läsa bildformatet. Kontrollera att filen är en giltig bild.', false);
        URL.revokeObjectURL(objectUrl);
    };

    imgTest.src = objectUrl;
}

function openNewImage() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (currentImageInfo && currentImageInfo.objectUrl) {
        URL.revokeObjectURL(currentImageInfo.objectUrl);
    }
    currentFile = null;
    currentImageInfo = null;
    fileInput.value = '';
    editorWorkspace.classList.add('hidden');
    dropzoneArea.classList.remove('hidden');
}

// Återställ applikationen
function resetApp() {
    if (confirm("Vill du rensa den aktiva bilden och börja om?")) {
        openNewImage();
        showToast("Återställt till startsidan");
    }
}

// ==========================================================================
// BESKÄRNING & REDIGERINGSVY (CROPPER)
// ==========================================================================
function initCropper(imageSrc) {
    if (cropper) {
        cropper.destroy();
    }

    imageElement.src = imageSrc;

    imageElement.onload = () => {
        cropper = new Cropper(imageElement, {
            viewMode: 1,
            dragMode: 'crop',
            autoCropArea: 1,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            ready() {
                updateCropDimensions();
                if (currentImageInfo) {
                    targetWidthInput.value = currentImageInfo.width;
                    targetHeightInput.value = currentImageInfo.height;
                }
                applyScalePercent(100);
            },
            crop(event) {
                updateCropDimensions();
                scheduleStatsUpdate();
            }
        });
    };
}

function updateCropDimensions() {
    if (!cropper) return;
    const cropData = cropper.getData(true);
    let w = Math.max(1, Math.round(cropData.width));
    let h = Math.max(1, Math.round(cropData.height));

    statusCropDim.textContent = `${w} × ${h} px`;

    // Uppdatera endast textfälten om användaren inte aktivt skriver i dem
    if (document.activeElement !== targetWidthInput && document.activeElement !== targetHeightInput) {
        targetWidthInput.value = w;
        targetHeightInput.value = h;
    }
}

// ==========================================================================
// KNAPPAR & VERKTYGSFÄLT
// ==========================================================================
function setupEventListeners() {
    // Aspektkvot-knappar
    const ratioButtons = document.querySelectorAll('#aspectRatioGroup .btn-tool');
    ratioButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            ratioButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const ratio = parseFloat(btn.dataset.ratio);
            if (cropper) {
                cropper.setAspectRatio(isNaN(ratio) ? NaN : ratio);
            }
        });
    });

    // Rotation & Spegling
    document.getElementById('btnRotateLeft').addEventListener('click', () => {
        if (!cropper) return;
        currentRotation = (currentRotation - 90 + 360) % 360;
        cropper.rotate(-90);
        scheduleStatsUpdate();
    });

    document.getElementById('btnRotateRight').addEventListener('click', () => {
        if (!cropper) return;
        currentRotation = (currentRotation + 90) % 360;
        cropper.rotate(90);
        scheduleStatsUpdate();
    });

    document.getElementById('btnFlipH').addEventListener('click', () => {
        if (!cropper) return;
        flipH = !flipH;
        cropper.scaleX(flipH ? -1 : 1);
        scheduleStatsUpdate();
    });

    document.getElementById('btnResetCrop').addEventListener('click', () => {
        if (!cropper) return;
        cropper.reset();
        currentRotation = 0;
        flipH = false;
        cropper.setAspectRatio(NaN);
        ratioButtons.forEach(b => b.classList.toggle('active', isNaN(parseFloat(b.dataset.ratio))));
        applyScalePercent(100);
        scheduleStatsUpdate();
        showToast('Beskärning återställd');
    });

    // Aspektlås
    aspectLockBtn.addEventListener('click', () => {
        aspectLocked = !aspectLocked;
        aspectLockBtn.classList.toggle('active', aspectLocked);
    });

    // Manuell Bredd / Höjd
    targetWidthInput.addEventListener('input', () => {
        if (!cropper) return;
        const newW = parseInt(targetWidthInput.value) || 1;
        if (aspectLocked) {
            const cropData = cropper.getData(true);
            const ratio = (cropData.width || 1) / Math.max(1, cropData.height || 1);
            const newH = Math.max(1, Math.round(newW / ratio));
            targetHeightInput.value = newH;
        }
        resetPillSelection();
        scheduleStatsUpdate();
    });

    targetHeightInput.addEventListener('input', () => {
        if (!cropper) return;
        const newH = parseInt(targetHeightInput.value) || 1;
        if (aspectLocked) {
            const cropData = cropper.getData(true);
            const ratio = (cropData.width || 1) / Math.max(1, cropData.height || 1);
            const newW = Math.max(1, Math.round(newH * ratio));
            targetWidthInput.value = newW;
        }
        resetPillSelection();
        scheduleStatsUpdate();
    });

    // Formatväljare
    const formatCards = document.querySelectorAll('#formatSelector .format-card');
    formatCards.forEach(card => {
        card.addEventListener('click', () => {
            formatCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            targetFormat = card.dataset.fmt;
            updateFormatUI();
            scheduleStatsUpdate();
        });
    });

    // Kvalitetsreglage
    qualitySlider.addEventListener('input', (e) => {
        quality = parseInt(e.target.value);
        qualityBubble.textContent = `${quality}%`;
        updateQualityGuide();
        scheduleStatsUpdate();
    });

    // Spara & Ladda ner
    btnDownload.addEventListener('click', () => {
        executeExport(true);
    });

    // Batch Formatväljare
    const batchFormatCards = document.querySelectorAll('#batchFormatSelector .format-card');
    batchFormatCards.forEach(card => {
        card.addEventListener('click', () => {
            batchFormatCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // Batch Kvalitet
    const batchQualitySlider = document.getElementById('batchQualitySlider');
    const batchQualityLabel = document.getElementById('batchQualityLabel');
    if (batchQualitySlider) {
        batchQualitySlider.addEventListener('input', (e) => {
            batchQualityLabel.textContent = `${e.target.value}%`;
        });
    }
}

function updateFormatUI() {
    const extMap = {
        'JPEG': '.jpg',
        'PNG': '.png',
        'BMP': '.bmp',
        'HEIF': '.jpg', // Webbläsare exporterar till högkvalitativ JPG
        'WEBP': '.webp'
    };
    exportExtLabel.textContent = extMap[targetFormat] || `.${targetFormat.toLowerCase()}`;

    if (targetFormat === 'BMP') {
        qualitySlider.disabled = true;
        qualityBubble.textContent = '100% (Rå)';
        qualityGuideText.textContent = 'BMP är okomprimerad råpixelgrafik. Hög filstorlek.';
    } else if (targetFormat === 'PNG') {
        qualitySlider.disabled = true;
        qualityBubble.textContent = '100% (Förlustfri)';
        qualityGuideText.textContent = 'PNG använder 100% förlustfri komprimering med stöd för transparens.';
    } else if (targetFormat === 'HEIF') {
        qualitySlider.disabled = false;
        qualityBubble.textContent = `${quality}%`;
        qualityGuideText.textContent = 'Webbläsare exporterar som högkomprimerad JPG/WebP optimerad för alla enheter.';
    } else {
        qualitySlider.disabled = false;
        qualityBubble.textContent = `${quality}%`;
        updateQualityGuide();
    }
}

function updateQualityGuide() {
    if (quality >= 90) {
        qualityGuideText.textContent = `${quality}%: Högsta bildkvalitet, mycket liten förlust men något större fil.`;
        qualityBubble.style.color = 'var(--primary-light)';
    } else if (quality >= 70) {
        qualityGuideText.textContent = `${quality}%: Rekommenderat läge! Utmärkt visuell skärpa med kraftig minskning i filstorlek.`;
        qualityBubble.style.color = 'var(--accent-emerald)';
    } else {
        qualityGuideText.textContent = `${quality}%: Hög komprimering, mycket liten filstorlek för snabb webbladdning.`;
        qualityBubble.style.color = 'var(--accent-amber)';
    }
}

function applyScalePercent(pct) {
    if (!cropper) return;
    const cropData = cropper.getData(true);
    const baseW = Math.round(cropData.width || 1);
    const baseH = Math.round(cropData.height || 1);

    const newW = Math.max(1, Math.round(baseW * (pct / 100)));
    const newH = Math.max(1, Math.round(baseH * (pct / 100)));

    targetWidthInput.value = newW;
    targetHeightInput.value = newH;

    document.querySelectorAll('.preset-pills .pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim() === `${pct}%`);
    });

    scheduleStatsUpdate();
}

function resetPillSelection() {
    document.querySelectorAll('.preset-pills .pill-btn').forEach(btn => btn.classList.remove('active'));
}

function setFixedDimension(w, h) {
    if (!cropper) return;
    const cropData = cropper.getData(true);
    const curW = Math.round(cropData.width || 1);
    const curH = Math.round(cropData.height || 1);
    const ratio = curW / Math.max(1, curH);

    if (w > 0 && h > 0) {
        targetWidthInput.value = w;
        targetHeightInput.value = h;
    } else if (w > 0 && h === 0) {
        targetWidthInput.value = w;
        targetHeightInput.value = Math.max(1, Math.round(w / ratio));
    } else if (h > 0 && w === 0) {
        targetHeightInput.value = h;
        targetWidthInput.value = Math.max(1, Math.round(h * ratio));
    }
    resetPillSelection();
    scheduleStatsUpdate();
}

// ==========================================================================
// KLIENTBASERAD RENDERING & FORMATKONVERTERING
// ==========================================================================

// Skapar en Canvas med beskärning, rotation, spegling och omskalning applicerad
function renderProcessedCanvas() {
    if (!cropper) return null;

    // Hämta beskuren canvas från cropper
    const croppedCanvas = cropper.getCroppedCanvas();
    if (!croppedCanvas) return null;

    const targetW = parseInt(targetWidthInput.value) || croppedCanvas.width;
    const targetH = parseInt(targetHeightInput.value) || croppedCanvas.height;

    // Om måtten matchar och ingen speciell bakgrund krävs
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const ctx = exportCanvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // För JPG och BMP lägg vit bakgrund ifall originalet hade transparens
    if (targetFormat === 'JPEG' || targetFormat === 'BMP' || targetFormat === 'HEIF') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
    }

    ctx.drawImage(croppedCanvas, 0, 0, targetW, targetH);
    return exportCanvas;
}

// Konvertera Canvas till Blob för valt format (inklusive BMP)
function canvasToBlobAsync(canvas, fmt, qual) {
    return new Promise((resolve) => {
        if (fmt === 'BMP') {
            const blob = encodeCanvasToBmp(canvas);
            resolve(blob);
            return;
        }

        let mimeType = 'image/jpeg';
        if (fmt === 'PNG') mimeType = 'image/png';
        else if (fmt === 'WEBP') mimeType = 'image/webp';
        else if (fmt === 'JPEG' || fmt === 'HEIF') mimeType = 'image/jpeg';

        canvas.toBlob((blob) => {
            resolve(blob);
        }, mimeType, qual / 100);
    });
}

// Ren JavaScript BMP-kodare (skapar äkta 24-bitars standard Windows .bmp filer)
function encodeCanvasToBmp(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const padding = (4 - ((width * 3) % 4)) % 4;
    const rowSize = width * 3 + padding;
    const pixelArraySize = rowSize * height;
    const fileSize = 54 + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // BITMAPFILEHEADER (14 bytes)
    view.setUint16(0, 0x4D42, false);        // 'BM'
    view.setUint32(2, fileSize, true);       // File size
    view.setUint32(6, 0, true);              // Reserverat
    view.setUint32(10, 54, true);            // Offset till pixeldata

    // BITMAPINFOHEADER (40 bytes)
    view.setUint32(14, 40, true);            // Header size
    view.setInt32(18, width, true);          // Bredd
    view.setInt32(22, height, true);         // Höjd (positiv = nedifrån och upp)
    view.setUint16(26, 1, true);             // Färgplan
    view.setUint16(28, 24, true);            // Bits per pixel (24-bit BGR)
    view.setUint32(30, 0, true);             // Ingen komprimering (BI_RGB)
    view.setUint32(34, pixelArraySize, true);// Pixeldata storlek
    view.setInt32(38, 2835, true);           // Horisontell upplösning (~72 DPI)
    view.setInt32(42, 2835, true);           // Vertikal upplösning (~72 DPI)
    view.setUint32(46, 0, true);             // Färgpalett antal
    view.setUint32(50, 0, true);             // Viktiga färger

    // Pixel data (nedifrån och upp, BGR ordning)
    let offset = 54;
    for (let y = height - 1; y >= 0; y--) {
        const rowStart = y * width * 4;
        for (let x = 0; x < width; x++) {
            const i = rowStart + x * 4;
            view.setUint8(offset++, data[i + 2]); // Blue
            view.setUint8(offset++, data[i + 1]); // Green
            view.setUint8(offset++, data[i]);     // Red
        }
        for (let p = 0; p < padding; p++) {
            view.setUint8(offset++, 0);
        }
    }

    return new Blob([buffer], { type: 'image/bmp' });
}

// Beräkna live-statistik i realtid (Upplösning, filstorlek och besparing)
function scheduleStatsUpdate() {
    clearTimeout(debounceTimer);
    statFinalSize.textContent = 'Beräknar...';
    debounceTimer = setTimeout(async () => {
        const canvas = renderProcessedCanvas();
        if (!canvas) return;

        statFinalRes.textContent = `${canvas.width} × ${canvas.height} px`;

        const blob = await canvasToBlobAsync(canvas, targetFormat, quality);
        if (!blob) return;

        lastProcessedBlob = blob;
        statFinalSize.textContent = formatFileSize(blob.size);

        if (currentImageInfo && currentImageInfo.fileSize > 0) {
            const orig = currentImageInfo.fileSize;
            const diff = ((blob.size - orig) / orig) * 100;
            const roundedDiff = Math.round(diff);

            if (roundedDiff < 0) {
                statSavings.textContent = `${Math.abs(roundedDiff)}% mindre`;
                statSavings.style.color = 'var(--accent-emerald)';
            } else if (roundedDiff > 0) {
                statSavings.textContent = `+${roundedDiff}%`;
                statSavings.style.color = 'var(--accent-amber)';
            } else {
                statSavings.textContent = `±0%`;
                statSavings.style.color = 'var(--text-muted)';
            }
        }
    }, 220);
}

// Spara & Ladda ner bild
async function executeExport(isDownload) {
    if (!cropper) return;

    showToast('Genererar optimerad bild...', true);
    const canvas = renderProcessedCanvas();
    if (!canvas) {
        showToast('Kunde inte skapa bilden', false);
        return;
    }

    const blob = await canvasToBlobAsync(canvas, targetFormat, quality);
    if (!blob) {
        showToast('Kunde inte konvertera bilden', false);
        return;
    }

    const ext = exportExtLabel.textContent || '.jpg';
    const baseName = customFilenameInput.value.trim() || 'optimerad_bild';
    const finalFilename = `${baseName}${ext}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast(`Sparad: ${finalFilename}!`);
}

// Kopiera till urklipp (Ctrl+C / Cmd+C kompatibelt)
async function copyImageToClipboard() {
    if (!cropper) return;
    try {
        const canvas = renderProcessedCanvas();
        if (!canvas) {
            showToast('Kunde inte skapa bild för urklipp', false);
            return;
        }

        canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('Kunde inte skapa urklippsdata', false);
                return;
            }
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                showToast('Bild kopierad till urklipp! Klistra in med Ctrl+V / Cmd+V.');
            } catch (err) {
                showToast('Urklippsbehörighet nekades: ' + err.message, false);
            }
        }, 'image/png');
    } catch (e) {
        showToast('Kunde inte kopiera till urklipp: ' + e.message, false);
    }
}

// ==========================================================================
// MASSKONVERTERING (BATCH)
// ==========================================================================
function setupBatchDropzone() {
    const bDropzone = document.getElementById('batchDropzone');
    const bFileInput = document.getElementById('batchFileInput');

    if (!bDropzone || !bFileInput) return;

    ['dragenter', 'dragover'].forEach(evt => {
        bDropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            bDropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        bDropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            bDropzone.classList.remove('drag-over');
        });
    });

    bDropzone.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files);
        addBatchFiles(files);
    });

    bFileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        addBatchFiles(files);
    });
}

function addBatchFiles(files) {
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.name.match(/\.(heic|heif|jpg|jpeg|png|bmp|webp)$/i));
    if (validFiles.length === 0) {
        showToast('Inga giltiga bildfiler hittades', false);
        return;
    }

    batchFiles = batchFiles.concat(validFiles);
    renderBatchFileList();
    showToast(`${validFiles.length} bilder lades till i listan`);
}

function clearBatchFiles() {
    batchFiles = [];
    document.getElementById('batchFileInput').value = '';
    renderBatchFileList();
}

function renderBatchFileList() {
    const listEl = document.getElementById('batchFilesList');
    const countLabel = document.getElementById('batchCountLabel');

    countLabel.textContent = `${batchFiles.length} bilder valda`;

    if (batchFiles.length === 0) {
        listEl.innerHTML = '<div class="empty-list-placeholder">Inga bilder valda ännu.</div>';
        return;
    }

    listEl.innerHTML = '';
    batchFiles.forEach((file, index) => {
        const row = document.createElement('div');
        row.className = 'batch-file-row';

        row.innerHTML = `
            <div class="batch-file-info">
                <span class="batch-file-name" title="${file.name}">📄 ${file.name}</span>
                <span class="batch-file-size">${formatFileSize(file.size)}</span>
            </div>
            <button class="btn-tool text-danger" onclick="removeBatchFile(${index})">✕</button>
        `;
        listEl.appendChild(row);
    });
}

function removeBatchFile(index) {
    batchFiles.splice(index, 1);
    renderBatchFileList();
}

function updateBatchScaleUI() {
    // Radio buttons change
}

// Kör masskonvertering 100% i webbläsaren och ladda ner som ZIP
async function startBatchConversion() {
    if (batchFiles.length === 0) {
        showToast('Välj minst en bild för masskonvertering', false);
        return;
    }

    if (typeof JSZip === 'undefined') {
        showToast('JSZip-biblioteket laddades inte', false);
        return;
    }

    const activeFormatCard = document.querySelector('#batchFormatSelector .format-card.active');
    const format = activeFormatCard ? activeFormatCard.dataset.fmt : 'JPEG';
    const batchQuality = parseInt(document.getElementById('batchQualitySlider')?.value || 85);

    const scaleType = document.querySelector('input[name="batchScaleType"]:checked')?.value || '100';
    let scalePercent = 100;
    let maxDim = 0;

    if (scaleType === 'percent') {
        scalePercent = parseInt(document.getElementById('batchScalePercentSelect').value) || 100;
    } else if (scaleType === 'max_dim') {
        maxDim = parseInt(document.getElementById('batchMaxDimInput').value) || 1920;
    }

    const btn = document.getElementById('btnRunBatch');
    btn.disabled = true;
    isBatchRunning = true;

    const zip = new JSZip();
    const extMap = { 'JPEG': '.jpg', 'PNG': '.png', 'BMP': '.bmp', 'WEBP': '.webp', 'HEIF': '.jpg' };
    const targetExt = extMap[format] || '.jpg';

    try {
        for (let i = 0; i < batchFiles.length; i++) {
            const file = batchFiles[i];
            btn.textContent = `Konverterar bild ${i + 1} av ${batchFiles.length}...`;

            let processBlob = file;
            const isHeic = file.name.match(/\.(heic|heif)$/i) || file.type.includes('heic') || file.type.includes('heif');

            if (isHeic && typeof heic2any === 'function') {
                try {
                    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
                    processBlob = Array.isArray(converted) ? converted[0] : converted;
                } catch (e) {
                    console.error('Kunde inte konvertera HEIC fil:', file.name, e);
                    continue;
                }
            }

            const img = await loadImageAsync(processBlob);
            let targetW = img.naturalWidth;
            let targetH = img.naturalHeight;

            if (scaleType === 'percent') {
                targetW = Math.max(1, Math.round(targetW * (scalePercent / 100)));
                targetH = Math.max(1, Math.round(targetH * (scalePercent / 100)));
            } else if (scaleType === 'max_dim' && maxDim > 0) {
                if (targetW > maxDim || targetH > maxDim) {
                    if (targetW >= targetH) {
                        targetH = Math.max(1, Math.round((targetH / targetW) * maxDim));
                        targetW = maxDim;
                    } else {
                        targetW = Math.max(1, Math.round((targetW / targetH) * maxDim));
                        targetH = maxDim;
                    }
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            if (format === 'JPEG' || format === 'BMP' || format === 'HEIF') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, targetW, targetH);
            }
            ctx.drawImage(img, 0, 0, targetW, targetH);

            const outBlob = await canvasToBlobAsync(canvas, format, batchQuality);

            const dotIdx = file.name.lastIndexOf('.');
            const base = dotIdx > 0 ? file.name.substring(0, dotIdx) : file.name;
            const outputName = `${base}${targetExt}`;

            zip.file(outputName, outBlob);
        }

        btn.textContent = 'Skapar ZIP-arkiv...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'konverterade_bilder.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

        showToast(`Klart! ${batchFiles.length} bilder sparade som konverterade_bilder.zip!`);
    } catch (err) {
        showToast('Masskonverteringsfel: ' + err.message, false);
    } finally {
        isBatchRunning = false;
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Konvertera alla & Ladda ner som ZIP
        `;
    }
}

function loadImageAsync(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Kunde inte ladda bild'));
        };
        img.src = url;
    });
}
