const API_BASE = 'http://localhost:5001';
let currentPage = 1;
let currentSearchPage = 1;

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showWelcome() {
    showScreen('welcome-screen');
}

function showAllData() {
    showScreen('all-data-screen');
    loadAllData(1);
}

function showSearchData() {
    showScreen('search-screen');
    loadCategories();
}

function showImageUpload() {
    showScreen('image-upload-screen');
    setupFileUpload();
}

function showGraphAnalysis() {
    showScreen('graph-analysis-screen');
    setupGraphUpload();
}

function showHDRUpload() {
    showScreen('hdr-upload-screen');
    setupHDRUpload();
}

function showAdvancedAnalysis() {
    showScreen('advanced-analysis-screen');
    setupAdvancedUpload();
}

function showHistory() {
    showScreen('history-screen');
    loadHistory();
}

function showResults() {
    showScreen('results-screen');
}

async function loadAllData(page = 1) {
    try {
        const response = await fetch(`${API_BASE}/data?page=${page}&per_page=10`);
        const data = await response.json();
        
        displayData(data.data, 'data-list');
        displayPagination(data.pagination, 'pagination', loadAllData);
        currentPage = page;
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadCategories() {
    try {
        // Load initial types
        const response = await fetch(`${API_BASE}/data/categories`);
        const categories = await response.json();

        populateSelect('type-filter', categories.types);
        // Clear class and subclass dropdowns
        clearSelect('class-filter');
        clearSelect('subclass-filter');
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadClasses(selectedType) {
    if (!selectedType) {
        clearSelect('class-filter');
        clearSelect('subclass-filter');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/data/categories?type=${encodeURIComponent(selectedType)}`);
        const categories = await response.json();

        populateSelect('class-filter', categories.classes);
        clearSelect('subclass-filter');
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

async function loadSubclasses(selectedType, selectedClass) {
    if (!selectedType || !selectedClass) {
        clearSelect('subclass-filter');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/data/categories?type=${encodeURIComponent(selectedType)}&class=${encodeURIComponent(selectedClass)}`);
        const categories = await response.json();

        populateSelect('subclass-filter', categories.subclasses);
    } catch (error) {
        console.error('Error loading subclasses:', error);
    }
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    // Clear existing options except the first one
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }

    if (options && options.length > 0) {
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        select.disabled = false;
    } else {
        select.disabled = true;
    }
}

function clearSelect(selectId) {
    const select = document.getElementById(selectId);
    // Keep only the first option (placeholder)
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    select.value = '';
    select.disabled = true;
}

async function searchData(page = 1) {
    const query = document.getElementById('search-input').value;
    const typeFilter = document.getElementById('type-filter').value;
    const classFilter = document.getElementById('class-filter').value;
    const subclassFilter = document.getElementById('subclass-filter').value;

    // Build query parameters
    const params = new URLSearchParams();
    if (query.trim()) params.append('q', query);
    if (typeFilter) params.append('type', typeFilter);
    if (classFilter) params.append('class', classFilter);
    if (subclassFilter) params.append('subclass', subclassFilter);
    params.append('page', page);
    params.append('per_page', 10);

    try {
        const response = await fetch(`${API_BASE}/data/search?${params.toString()}`);
        const data = await response.json();

        displayData(data.data, 'search-results');
        displayPagination(data.pagination, 'search-pagination', (p) => searchData(p));
        currentSearchPage = page;
    } catch (error) {
        console.error('Error searching data:', error);
    }
}

async function onTypeChange() {
    const selectedType = document.getElementById('type-filter').value;
    await loadClasses(selectedType);
    searchData();
}

async function onClassChange() {
    const selectedType = document.getElementById('type-filter').value;
    const selectedClass = document.getElementById('class-filter').value;
    await loadSubclasses(selectedType, selectedClass);
    searchData();
}

function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('type-filter').value = '';
    clearSelect('class-filter');
    clearSelect('subclass-filter');
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-pagination').innerHTML = '';
}

function displayData(data, containerId) {
    const container = document.getElementById(containerId);
    
    if (data.length === 0) {
        container.innerHTML = '<p>No data found.</p>';
        return;
    }
    
    container.innerHTML = data.map(item => `
        <div class="data-item" onclick="showDataDetail('${item._id}')">
            <h3>${item.metadata?.Name || 'Unknown'}</h3>
            <p><strong>Type:</strong> ${item.metadata?.Type || 'N/A'}</p>
            <p><strong>Class:</strong> ${item.metadata?.Class || 'N/A'}</p>
            <p><strong>Subclass:</strong> ${item.metadata?.Subclass || 'N/A'}</p>
            <p><strong>Data Points:</strong> ${item.spectral_data?.length || 0}</p>
        </div>
    `).join('');
}

function displayPagination(pagination, containerId, onPageClick) {
    const container = document.getElementById(containerId);
    const { page, pages } = pagination;
    
    let paginationHTML = '';
    
    if (page > 1) {
        paginationHTML += `<button onclick="${onPageClick.name}(${page - 1})">Previous</button>`;
    }
    
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
        paginationHTML += `<button class="${i === page ? 'active' : ''}" onclick="${onPageClick.name}(${i})">${i}</button>`;
    }
    
    if (page < pages) {
        paginationHTML += `<button onclick="${onPageClick.name}(${page + 1})">Next</button>`;
    }
    
    container.innerHTML = paginationHTML;
}

async function showDataDetail(id) {
    try {
        const response = await fetch(`${API_BASE}/retrieve/${id}`);
        const data = await response.json();
        
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <h2>${data.metadata?.Name || 'Unknown'}</h2>
            <div class="metadata-grid">
                ${Object.entries(data.metadata || {}).map(([key, value]) => `
                    <div class="metadata-item">
                        <strong>${key}:</strong> ${value}
                    </div>
                `).join('')}
            </div>
            <h3>Spectral Data (${data.spectral_data?.length || 0} points)</h3>
            <canvas id="spectral-chart" class="spectral-chart"></canvas>
        `;
        
        document.getElementById('data-modal').style.display = 'block';
        
        // Draw simple chart
        if (data.spectral_data) {
            drawSpectralChart(data.spectral_data);
        }
    } catch (error) {
        console.error('Error loading data detail:', error);
    }
}

// ============================================
// PART 1: Main Chart Drawing Function
// ============================================
function drawSpectralChart(spectralData) {
    const canvas = document.getElementById('spectral-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const config = {
        margin: { top: 40, right: 40, bottom: 70, left: 80 },
        numXTicks: 8,
        numYTicks: 8,
        lineColor: '#2196F3',
        gridColor: '#e0e0e0',
        axisColor: '#333',
        maxPoints: 50
    };

    const dimensions = {
        width: canvas.width - config.margin.left - config.margin.right,
        height: canvas.height - config.margin.top - config.margin.bottom
    };

    // Calculate data ranges
    const ranges = calculateDataRanges(spectralData);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all chart components
    drawGrid(ctx, canvas, config, dimensions);
    drawAxes(ctx, canvas, config, dimensions);
    drawAxisTicks(ctx, canvas, config, dimensions, ranges);
    drawAxisLabels(ctx, canvas, config);
    const dataPoints = drawDataLine(ctx, canvas, config, dimensions, spectralData, ranges);
    drawDataPoints(ctx, dataPoints, config);

    // Setup interactivity
    setupCanvasHover(canvas, dataPoints, config, ranges);
}

// ============================================
// PART 2: Data Range Calculation
// ============================================
function calculateDataRanges(spectralData) {
    const xValues = spectralData.map(point => point[0]);
    const yValues = spectralData.map(point => point[1]);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    // Add padding to y-axis range
    const yRange = yMax - yMin;
    const paddedYMin = yMin - yRange * 0.1;
    const paddedYMax = yMax + yRange * 0.1;

    return { xMin, xMax, yMin, yMax, paddedYMin, paddedYMax };
}

// ============================================
// PART 3: Grid Drawing
// ============================================
function drawGrid(ctx, canvas, config, dimensions) {
    ctx.strokeStyle = config.gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical grid lines
    for (let i = 0; i <= config.numXTicks; i++) {
        const x = config.margin.left + (dimensions.width / config.numXTicks) * i;
        ctx.beginPath();
        ctx.moveTo(x, config.margin.top);
        ctx.lineTo(x, canvas.height - config.margin.bottom);
        ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= config.numYTicks; i++) {
        const y = config.margin.top + (dimensions.height / config.numYTicks) * i;
        ctx.beginPath();
        ctx.moveTo(config.margin.left, y);
        ctx.lineTo(canvas.width - config.margin.right, y);
        ctx.stroke();
    }

    ctx.setLineDash([]);
}

// ============================================
// PART 4: Axes Drawing
// ============================================
function drawAxes(ctx, canvas, config, dimensions) {
    ctx.strokeStyle = config.axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(config.margin.left, config.margin.top);
    ctx.lineTo(config.margin.left, canvas.height - config.margin.bottom);
    ctx.lineTo(canvas.width - config.margin.right, canvas.height - config.margin.bottom);
    ctx.stroke();
}

// ============================================
// PART 5: Axis Ticks and Labels
// ============================================
function drawAxisTicks(ctx, canvas, config, dimensions, ranges) {
    ctx.fillStyle = config.axisColor;
    ctx.font = 'bold 11px Arial';

    // X-axis ticks
    ctx.textAlign = 'center';
    for (let i = 0; i <= config.numXTicks; i++) {
        const x = config.margin.left + (dimensions.width / config.numXTicks) * i;
        const value = ranges.xMin + ((ranges.xMax - ranges.xMin) / config.numXTicks) * i;

        ctx.beginPath();
        ctx.moveTo(x, canvas.height - config.margin.bottom);
        ctx.lineTo(x, canvas.height - config.margin.bottom + 5);
        ctx.stroke();

        ctx.fillText(value.toFixed(2), x, canvas.height - config.margin.bottom + 20);
    }

    // Y-axis ticks
    ctx.textAlign = 'right';
    for (let i = 0; i <= config.numYTicks; i++) {
        const y = config.margin.top + (dimensions.height / config.numYTicks) * i;
        const value = ranges.paddedYMax - ((ranges.paddedYMax - ranges.paddedYMin) / config.numYTicks) * i;

        ctx.beginPath();
        ctx.moveTo(config.margin.left - 5, y);
        ctx.lineTo(config.margin.left, y);
        ctx.stroke();

        ctx.fillText(value.toFixed(3), config.margin.left - 10, y + 4);
    }
}

// ============================================
// PART 6: Axis Labels
// ============================================
function drawAxisLabels(ctx, canvas, config) {
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    // X-axis label
    ctx.fillText('Wavelength (μm)', canvas.width / 2, canvas.height - 10);

    // Y-axis label (rotated)
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Reflectance', 0, 0);
    ctx.restore();
}

// ============================================
// PART 7: Data Line Drawing
// ============================================
function drawDataLine(ctx, canvas, config, dimensions, spectralData, ranges) {
    ctx.strokeStyle = config.lineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const dataPoints = [];
    spectralData.forEach((point, index) => {
        const x = config.margin.left + ((point[0] - ranges.xMin) / (ranges.xMax - ranges.xMin)) * dimensions.width;
        const y = canvas.height - config.margin.bottom - ((point[1] - ranges.paddedYMin) / (ranges.paddedYMax - ranges.paddedYMin)) * dimensions.height;

        dataPoints.push({ x, y, wavelength: point[0], reflectance: point[1] });

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
    return dataPoints;
}

// ============================================
// PART 8: Data Points Drawing
// ============================================
function drawDataPoints(ctx, dataPoints, config) {
    ctx.fillStyle = config.lineColor;
    const step = Math.max(1, Math.floor(dataPoints.length / config.maxPoints));

    for (let i = 0; i < dataPoints.length; i += step) {
        ctx.beginPath();
        ctx.arc(dataPoints[i].x, dataPoints[i].y, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// ============================================
// PART 9: Hover Functionality Setup
// ============================================
function setupCanvasHover(canvas, dataPoints, config, ranges) {
    const tooltip = getOrCreateTooltip();

    // Remove old event listeners by cloning
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);

    newCanvas.addEventListener('mousemove', (e) => {
        handleMouseMove(e, newCanvas, dataPoints, config, ranges, tooltip);
    });

    newCanvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        newCanvas.style.cursor = 'default';
    });
}

// ============================================
// PART 10: Tooltip Creation
// ============================================
function getOrCreateTooltip() {
    let tooltip = document.getElementById('canvas-tooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'canvas-tooltip';
        Object.assign(tooltip.style, {
            position: 'absolute',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            display: 'none',
            zIndex: '1000',
            whiteSpace: 'nowrap'
        });
        document.body.appendChild(tooltip);
    }

    return tooltip;
}

// ============================================
// PART 11: Mouse Move Handler
// ============================================
function handleMouseMove(e, canvas, dataPoints, config, ranges, tooltip) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const nearestPoint = findNearestPoint(mouseX, mouseY, dataPoints);

    if (nearestPoint) {
        redrawChartWithHighlight(canvas, dataPoints, config, ranges, nearestPoint);
        showTooltip(tooltip, nearestPoint, e.clientX, e.clientY);
        canvas.style.cursor = 'pointer';
    } else {
        tooltip.style.display = 'none';
        canvas.style.cursor = 'default';
    }
}

// ============================================
// PART 12: Find Nearest Point
// ============================================
function findNearestPoint(mouseX, mouseY, dataPoints, threshold = 20) {
    let nearestPoint = null;
    let minDistance = Infinity;

    dataPoints.forEach(point => {
        const distance = Math.sqrt(
            Math.pow(mouseX - point.x, 2) +
            Math.pow(mouseY - point.y, 2)
        );

        if (distance < minDistance && distance < threshold) {
            minDistance = distance;
            nearestPoint = point;
        }
    });

    return nearestPoint;
}

// ============================================
// PART 13: Redraw with Highlight
// ============================================
function redrawChartWithHighlight(canvas, dataPoints, config, ranges, nearestPoint) {
    const spectralData = dataPoints.map(p => [p.wavelength, p.reflectance]);
    const ctx = canvas.getContext('2d');

    // Redraw base chart
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const dimensions = {
        width: canvas.width - config.margin.left - config.margin.right,
        height: canvas.height - config.margin.top - config.margin.bottom
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas, config, dimensions);
    drawAxes(ctx, canvas, config, dimensions);
    drawAxisTicks(ctx, canvas, config, dimensions, ranges);
    drawAxisLabels(ctx, canvas, config);
    drawDataLine(ctx, canvas, config, dimensions, spectralData, ranges);
    drawDataPoints(ctx, dataPoints, config);

    // Highlight point
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.arc(nearestPoint.x, nearestPoint.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw crosshair
    drawCrosshair(ctx, canvas, config, nearestPoint);
}

// ============================================
// PART 14: Crosshair Drawing
// ============================================
function drawCrosshair(ctx, canvas, config, point) {
    ctx.strokeStyle = 'rgba(255, 87, 34, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(point.x, config.margin.top);
    ctx.lineTo(point.x, canvas.height - config.margin.bottom);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(config.margin.left, point.y);
    ctx.lineTo(canvas.width - config.margin.right, point.y);
    ctx.stroke();

    ctx.setLineDash([]);
}

// ============================================
// PART 15: Tooltip Display
// ============================================
function showTooltip(tooltip, point, clientX, clientY) {
    tooltip.style.display = 'block';
    tooltip.style.left = (clientX + 15) + 'px';
    tooltip.style.top = (clientY - 30) + 'px';
    tooltip.innerHTML = `
        <strong>Wavelength:</strong> ${point.wavelength.toFixed(3)} μm<br>
        <strong>Reflectance:</strong> ${point.reflectance.toFixed(4)}
    `;
}

// ============================================
// END OF MODULAR CANVAS CHART IMPLEMENTATION
// ============================================
// All chart functions are now split into 15 parts:
// 1. Main drawing function
// 2. Data range calculation
// 3. Grid drawing
// 4. Axes drawing
// 5. Axis ticks and labels
// 6. Axis labels
// 7. Data line drawing
// 8. Data points drawing
// 9. Hover functionality setup
// 10. Tooltip creation
// 11. Mouse move handler
// 12. Find nearest point
// 13. Redraw with highlight
// 14. Crosshair drawing
// 15. Tooltip display
// ============================================

function closeModal() {
    document.getElementById('data-modal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('data-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Global variables for camera and image handling
let currentStream = null;
let currentImageData = null;
let currentGraphData = null;
let currentAdvancedData = null;

// Image Upload and Camera Functions
function setupFileUpload() {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('file-drop-zone');

    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop handlers
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleFileDrop);
    dropZone.addEventListener('click', () => fileInput.click());
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        displayImagePreview(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        displayImagePreview(files[0]);
    }
}

function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('preview-image');
        const previewContainer = document.getElementById('preview-container');

        previewImage.src = e.target.result;
        previewContainer.style.display = 'block';
        currentImageData = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' } // Use back camera on mobile
        });

        const video = document.getElementById('camera-video');
        const startBtn = document.getElementById('start-camera-btn');
        const captureBtn = document.getElementById('capture-btn');
        const stopBtn = document.getElementById('stop-camera-btn');

        video.srcObject = stream;
        video.style.display = 'block';
        currentStream = stream;

        startBtn.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions or use file upload instead.');
    }
}

function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Display preview
    const previewImage = document.getElementById('preview-image');
    const previewContainer = document.getElementById('preview-container');

    previewImage.src = imageData;
    previewContainer.style.display = 'block';
    currentImageData = imageData;

    // Stop camera
    stopCamera();
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }

    const video = document.getElementById('camera-video');
    const startBtn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const stopBtn = document.getElementById('stop-camera-btn');

    video.style.display = 'none';
    startBtn.style.display = 'inline-block';
    captureBtn.style.display = 'none';
    stopBtn.style.display = 'none';
}

function clearPreview() {
    const previewContainer = document.getElementById('preview-container');
    previewContainer.style.display = 'none';
    currentImageData = null;

    // Reset file input
    document.getElementById('file-input').value = '';
}

async function analyzeImage() {
    if (!currentImageData) {
        alert('Please select or capture an image first.');
        return;
    }

    const loadingContainer = document.getElementById('loading-container');
    const previewContainer = document.getElementById('preview-container');

    // Show loading
    previewContainer.style.display = 'none';
    loadingContainer.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/predict/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: currentImageData
            })
        });

        const result = await response.json();

        if (response.ok) {
            displayResults(result);
            showResults();
        } else {
            throw new Error(result.error || 'Analysis failed');
        }

    } catch (error) {
        console.error('Error analyzing image:', error);
        alert('Error analyzing image: ' + error.message);
    } finally {
        loadingContainer.style.display = 'none';
    }
}

// Graph Analysis Functions
function setupGraphUpload() {
    const graphInput = document.getElementById('graph-input');
    const dropZone = document.getElementById('graph-drop-zone');

    // File input change handler
    graphInput.addEventListener('change', handleGraphFileSelect);

    // Drag and drop handlers
    dropZone.addEventListener('dragover', handleGraphDragOver);
    dropZone.addEventListener('dragleave', handleGraphDragLeave);
    dropZone.addEventListener('drop', handleGraphFileDrop);
    dropZone.addEventListener('click', () => graphInput.click());
}

function handleGraphFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        displayGraphPreview(file);
    }
}

function handleGraphDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleGraphDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

function handleGraphFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        displayGraphPreview(files[0]);
    }
}

function displayGraphPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('graph-preview-image');
        const previewContainer = document.getElementById('graph-preview-container');

        previewImage.src = e.target.result;
        previewContainer.style.display = 'block';
        currentGraphData = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearGraphPreview() {
    const previewContainer = document.getElementById('graph-preview-container');
    previewContainer.style.display = 'none';
    currentGraphData = null;

    // Reset file input
    document.getElementById('graph-input').value = '';
}

async function analyzeGraph() {
    if (!currentGraphData) {
        alert('Please select a graph image first.');
        return;
    }

    const loadingContainer = document.getElementById('graph-loading-container');
    const previewContainer = document.getElementById('graph-preview-container');

    // Show loading
    previewContainer.style.display = 'none';
    loadingContainer.style.display = 'block';

    try {
        // Use the ensemble endpoint for comprehensive graph analysis
        const response = await fetch(`${API_BASE}/predict/ensemble`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: currentGraphData
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Use the ensemble results display function
            displayEnsembleResults(result);
            showResults();
        } else {
            throw new Error(result.error || 'Graph analysis failed');
        }

    } catch (error) {
        console.error('Error analyzing graph:', error);
        alert('Error analyzing graph: ' + error.message);
    } finally {
        loadingContainer.style.display = 'none';
    }
}

// HDR Upload Functions
function setupHDRUpload() {
    const hdrInput = document.getElementById('hdr-file-input');
    const imgInput = document.getElementById('img-file-input');

    // File input change handlers
    hdrInput.addEventListener('change', handleHDRFileSelect);
    imgInput.addEventListener('change', handleIMGFileSelect);
}

let selectedHDRFile = null;
let selectedIMGFile = null;

function handleHDRFileSelect(event) {
    const file = event.target.files[0];
    if (file && (file.name.endsWith('.hdr') || file.name.endsWith('.csv'))) {
        selectedHDRFile = file;
        document.getElementById('hdr-filename').textContent = file.name;
        document.getElementById('hdr-file-info').style.display = 'block';
        document.getElementById('hdr-preview-container').style.display = 'block';
    } else {
        alert('Please select a valid .hdr or .csv file');
    }
}

function handleIMGFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.img')) {
        selectedIMGFile = file;
        document.getElementById('img-filename').textContent = file.name;
    } else {
        alert('Please select a valid .img file');
    }
}

function clearHDRPreview() {
    selectedHDRFile = null;
    selectedIMGFile = null;
    document.getElementById('hdr-file-input').value = '';
    document.getElementById('img-file-input').value = '';
    document.getElementById('hdr-file-info').style.display = 'none';
    document.getElementById('hdr-preview-container').style.display = 'none';
    document.getElementById('img-filename').textContent = 'Not selected';
}

async function analyzeHDR() {
    if (!selectedHDRFile) {
        alert('Please select an HDR file first');
        return;
    }

    const loadingContainer = document.getElementById('hdr-loading-container');
    loadingContainer.style.display = 'block';

    try {
        const formData = new FormData();
        formData.append('hdrFile', selectedHDRFile);
        if (selectedIMGFile) {
            formData.append('imgFile', selectedIMGFile);
        }

        const response = await fetch(`${API_BASE}/predict/hdr`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            displayEnsembleResults(result);
            showResults();
        } else {
            throw new Error(result.error || 'HDR analysis failed');
        }

    } catch (error) {
        console.error('Error analyzing HDR:', error);
        alert('Error analyzing HDR: ' + error.message);
    } finally {
        loadingContainer.style.display = 'none';
    }
}

function displayGraphResults(result) {
    const resultsContainer = document.getElementById('results-screen');

    if (!resultsContainer) {
        console.error('Results screen element not found');
        return;
    }

    if (!result) {
        console.error('No graph analysis result provided');
        resultsContainer.innerHTML = '<p>Error: No graph analysis results available.</p>';
        return;
    }

    const similarityScore = Math.round((result.best_similarity || 0) * 100);

    try {
        resultsContainer.innerHTML = `
        <div class="header">
            <h2>📊 Graph Analysis Results</h2>
            <button class="btn back" onclick="showGraphAnalysis()">← Back to Graph Analysis</button>
        </div>

        <div class="analysis-results-container">
            <div class="quality-score-card">
                <div class="quality-score">${similarityScore}/100</div>
                <div class="quality-label">Similarity Score</div>
            </div>

            <div class="analysis-section">
                <h3>📈 Extracted Spectral Curve</h3>
                <div class="curve-info">
                    <p><strong>Data Points:</strong> ${result.extracted_curve.num_points}</p>
                    <p><strong>Wavelength Range:</strong> Normalized (0-1)</p>
                    <p><strong>Analysis Type:</strong> Cosine Similarity Matching</p>
                </div>
            </div>

            <div class="analysis-section">
                <h3>🔍 Similar Spectra Found</h3>
                <p class="match-summary">Found ${result.total_matches} similar spectra in database</p>

                ${result.total_matches > 0 ? `
                <div class="spectral-matches-grid">
                    ${result.similar_spectra.slice(0, 6).map((match, index) => `
                        <div class="spectral-match-card">
                            <div class="match-header">
                                <span class="match-rank">#${index + 1}</span>
                                <span class="similarity-score">${Math.round(match.similarity_score * 100)}% match</span>
                            </div>
                            <div class="match-details">
                                <h4>${match.metadata.Name || 'Unknown Material'}</h4>
                                <p><strong>Type:</strong> ${match.metadata.Type || 'N/A'}</p>
                                <p><strong>Class:</strong> ${match.metadata.Class || 'N/A'}</p>
                                <p><strong>Subclass:</strong> ${match.metadata.Subclass || 'N/A'}</p>
                                <p><strong>Origin:</strong> ${match.metadata.Origin || 'N/A'}</p>
                                <p><strong>Spectrum Length:</strong> ${match.spectrum_length} points</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : `
                <div class="no-matches">
                    <p>No similar spectra found in the database. This may indicate a unique or uncommon spectral signature.</p>
                </div>
                `}
            </div>

            <div class="analysis-section">
                <h3>📋 Analysis Summary</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Best Match:</span>
                        <span class="summary-value">${result.similar_spectra && result.similar_spectra.length > 0 ? result.similar_spectra[0].metadata.Name || 'Unknown Material' : 'No matches found'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Similarity Score:</span>
                        <span class="summary-value">${similarityScore}%</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Matches:</span>
                        <span class="summary-value">${result.total_matches}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Analysis ID:</span>
                        <span class="summary-value">${result.analysis_id}</span>
                    </div>
                </div>
            </div>

            <div class="analysis-section">
                <h3>💡 Recommendations</h3>
                <div class="recommendations">
                    ${similarityScore >= 80 ?
                        '<p class="recommendation good">✅ High similarity found! The uploaded graph closely matches known spectral data.</p>' :
                        similarityScore >= 60 ?
                        '<p class="recommendation moderate">⚠️ Moderate similarity found. Consider reviewing the matches for potential identification.</p>' :
                        '<p class="recommendation low">❌ Low similarity found. The graph may represent a unique or uncommon material.</p>'
                    }
                    <p class="recommendation">📊 For better results, ensure the graph image is clear and shows the complete spectral curve.</p>
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error displaying graph results:', error);
        resultsContainer.innerHTML = '<p>Error displaying graph analysis results. Please try again.</p>';
    }
}

// Advanced Analysis Functions
function setupAdvancedUpload() {
    const advancedInput = document.getElementById('advanced-input');
    const dropZone = document.getElementById('advanced-drop-zone');

    // File input change handler
    advancedInput.addEventListener('change', handleAdvancedFileSelect);

    // Drag and drop handlers
    dropZone.addEventListener('dragover', handleAdvancedDragOver);
    dropZone.addEventListener('dragleave', handleAdvancedDragLeave);
    dropZone.addEventListener('drop', handleAdvancedFileDrop);
    dropZone.addEventListener('click', () => advancedInput.click());
}

function handleAdvancedFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        displayAdvancedPreview(file);
    }
}

function handleAdvancedDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleAdvancedDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

function handleAdvancedFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        displayAdvancedPreview(files[0]);
    }
}

function displayAdvancedPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('advanced-preview-image');
        const previewContainer = document.getElementById('advanced-preview-container');

        previewImage.src = e.target.result;
        previewContainer.style.display = 'block';
        currentAdvancedData = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearAdvancedPreview() {
    const previewContainer = document.getElementById('advanced-preview-container');
    previewContainer.style.display = 'none';
    currentAdvancedData = null;

    // Reset file input
    document.getElementById('advanced-input').value = '';
}

async function performAdvancedAnalysis() {
    if (!currentAdvancedData) {
        alert('Please select an image first.');
        return;
    }

    // Get selected analysis type
    const analysisType = document.querySelector('input[name="analysisType"]:checked').value;

    const loadingContainer = document.getElementById('advanced-loading-container');
    const previewContainer = document.getElementById('advanced-preview-container');

    // Show loading with progress animation
    previewContainer.style.display = 'none';
    loadingContainer.style.display = 'block';

    // Animate progress steps
    animateAnalysisProgress();

    try {
        // Use new ensemble endpoint for graph analysis
        const endpoint = analysisType === 'graph' || analysisType === 'auto'
            ? `${API_BASE}/predict/ensemble`
            : `${API_BASE}/predict/advanced`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: currentAdvancedData,
                analysisType: analysisType
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Check if it's ensemble result
            if (result.analysis_type === 'ensemble_4_methods') {
                displayEnsembleResults(result);
            } else {
                displayAdvancedResults(result);
            }
            showResults();
        } else {
            throw new Error(result.error || 'Advanced analysis failed');
        }

    } catch (error) {
        console.error('Error in advanced analysis:', error);
        alert('Error in advanced analysis: ' + error.message);
    } finally {
        loadingContainer.style.display = 'none';
    }
}

function animateAnalysisProgress() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.style.color = '#2196F3';
            step.style.fontWeight = 'bold';
        }, index * 500);
    });
}

function displayAdvancedResults(result) {
    const resultsContainer = document.getElementById('results-screen');

    if (!resultsContainer) {
        console.error('Results screen element not found');
        return;
    }

    if (!result) {
        console.error('No advanced analysis result provided');
        resultsContainer.innerHTML = '<p>Error: No advanced analysis results available.</p>';
        return;
    }

    const bestScore = Math.round((result.best_score || 0) * 100);
    const methodResults = result.method_results || {};

    try {
        resultsContainer.innerHTML = `
        <div class="header">
            <h2>🔬 Advanced Spectral Analysis Results</h2>
            <button class="btn back" onclick="showAdvancedAnalysis()">← Back to Advanced Analysis</button>
        </div>

        <div class="analysis-results-container">
            <div class="quality-score-card">
                <div class="quality-score">${bestScore}/100</div>
                <div class="quality-label">Best Method Score</div>
                <div class="best-method">🏆 ${result.best_method_name || 'Unknown Method'}</div>
            </div>

            <div class="analysis-section">
                <h3>📊 Method Comparison</h3>
                <div class="methods-comparison">
                    ${Object.entries(methodResults).map(([method, data]) => `
                        <div class="method-result ${method === result.best_method ? 'best-method' : ''}">
                            <div class="method-header">
                                <span class="method-name">${data.method_name || method}</span>
                                <span class="method-score">${Math.round((data.score || 0) * 100)}%</span>
                            </div>
                            <div class="method-confidence">
                                Confidence: ${Math.round((data.confidence || 0) * 100)}%
                            </div>
                            ${method === result.best_method ? '<div class="best-badge">🏆 Best Method</div>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="analysis-section">
                <h3>🎯 Prediction Results</h3>
                <div class="prediction-details">
                    <div class="prediction-item">
                        <span class="prediction-label">Material Type:</span>
                        <span class="prediction-value">${result.prediction?.type || 'Unknown'}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-label">Class:</span>
                        <span class="prediction-value">${result.prediction?.class || 'Unknown'}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-label">Subclass:</span>
                        <span class="prediction-value">${result.prediction?.subclass || 'Unknown'}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-label">Material Name:</span>
                        <span class="prediction-value">${result.prediction?.material_name || 'Unknown'}</span>
                    </div>
                </div>
            </div>

            ${result.cosine_matches && result.cosine_matches.length > 0 ? `
            <div class="analysis-section">
                <h3>🔍 Similar Spectra (Cosine Similarity)</h3>
                <div class="spectral-matches-grid">
                    ${result.cosine_matches.slice(0, 4).map((match, index) => `
                        <div class="spectral-match-card">
                            <div class="match-header">
                                <span class="match-rank">#${index + 1}</span>
                                <span class="similarity-score">${Math.round(match.similarity * 100)}% match</span>
                            </div>
                            <div class="match-details">
                                <h4>${match.document?.metadata?.Name || 'Unknown Material'}</h4>
                                <p><strong>Type:</strong> ${match.document?.metadata?.Type || 'N/A'}</p>
                                <p><strong>Class:</strong> ${match.document?.metadata?.Class || 'N/A'}</p>
                                <p><strong>Origin:</strong> ${match.document?.metadata?.Origin || 'N/A'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="analysis-section">
                <h3>🔬 Feature Analysis</h3>
                <div class="features-grid">
                    ${result.features?.wavelet ? `
                    <div class="feature-card">
                        <h4>🌊 Wavelet Features</h4>
                        <p><strong>Energy:</strong> ${result.features.wavelet.energy?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Entropy:</strong> ${result.features.wavelet.entropy?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Dominant Scale:</strong> ${result.features.wavelet.dominant_scale || 'N/A'}</p>
                    </div>
                    ` : ''}

                    ${result.features?.hilbert ? `
                    <div class="feature-card">
                        <h4>🔄 Hilbert Features</h4>
                        <p><strong>Envelope Energy:</strong> ${result.features.hilbert.envelope_energy?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Phase Variance:</strong> ${result.features.hilbert.phase_variance?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Freq. Mean:</strong> ${result.features.hilbert.freq_mean?.toFixed(2) || 'N/A'}</p>
                    </div>
                    ` : ''}

                    ${result.features?.fractal ? `
                    <div class="feature-card">
                        <h4>🔺 Fractal Features</h4>
                        <p><strong>Higuchi FD:</strong> ${result.features.fractal.higuchi_fd?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Box Counting FD:</strong> ${result.features.fractal.box_counting_fd?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Complexity:</strong> ${result.features.fractal.complexity?.toFixed(2) || 'N/A'}</p>
                    </div>
                    ` : ''}

                    ${result.features?.spectral_depth ? `
                    <div class="feature-card">
                        <h4>📊 Spectral Depth</h4>
                        <p><strong>Absorption Features:</strong> ${result.features.spectral_depth.num_absorption_features || 'N/A'}</p>
                        <p><strong>Depth Range:</strong> ${result.features.spectral_depth.depth_range?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Band Depth Max:</strong> ${result.features.spectral_depth.band_depth_max?.toFixed(2) || 'N/A'}</p>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="analysis-section">
                <h3>💡 Analysis Summary</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Best Method:</span>
                        <span class="summary-value">${result.best_method_name || 'Unknown'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Accuracy Score:</span>
                        <span class="summary-value">${bestScore}%</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Analysis Type:</span>
                        <span class="summary-value">${result.analysis_type || 'Unknown'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Analysis ID:</span>
                        <span class="summary-value">${result.analysis_id || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error displaying advanced results:', error);
        resultsContainer.innerHTML = '<p>Error displaying advanced analysis results. Please try again.</p>';
    }
}

function displayEnsembleResults(result) {
    const resultsContainer = document.getElementById('results-screen');

    if (!resultsContainer) {
        console.error('Results screen element not found');
        return;
    }

    if (!result) {
        console.error('No ensemble result provided');
        resultsContainer.innerHTML = '<p>Error: No ensemble results available.</p>';
        return;
    }

    const accuracyScore = Math.round(result.accuracy_percentage || 0);
    const analytics = result.analytics || {};
    const methodResults = result.method_results || {};
    const extractionAnalytics = result.extraction_analytics || {};

    // Determine confidence color
    const confidenceColor = accuracyScore >= 95 ? '#4CAF50' :
                           accuracyScore >= 85 ? '#8BC34A' :
                           accuracyScore >= 75 ? '#FF9800' : '#FF5722';

    // Determine extraction quality color
    const extractionQuality = extractionAnalytics.quality_score || 0;
    const extractionColor = extractionQuality >= 7 ? '#4CAF50' :
                           extractionQuality >= 5 ? '#8BC34A' :
                           extractionQuality >= 3 ? '#FF9800' : '#FF5722';

    try {
        resultsContainer.innerHTML = `
        <div class="header">
            <h2>🔬 4-Method Ensemble Analysis Results</h2>
            <button class="btn back" onclick="showAdvancedAnalysis()">← Back to Advanced Analysis</button>
        </div>

        <div class="analysis-results-container">
            <!-- Main Prediction Card -->
            <div class="quality-score-card" style="background: linear-gradient(135deg, ${confidenceColor}22, ${confidenceColor}44);">
                <div class="quality-score" style="color: ${confidenceColor}">${accuracyScore}%</div>
                <div class="quality-label">Accuracy Score</div>
                <div class="best-method">🏆 Best Method: ${result.best_method.toUpperCase()}</div>
                <div class="prediction-name" style="font-size: 1.5em; margin-top: 10px; font-weight: bold;">
                    ${result.best_prediction}
                </div>
            </div>

            <!-- Extraction Analytics Section -->
            ${extractionAnalytics.method_used ? `
            <div class="analysis-section" style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-left: 4px solid ${extractionColor};">
                <h3>🔍 Graph Extraction Analytics</h3>
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="analytics-label">Extraction Method</div>
                        <div class="analytics-value" style="font-size: 1.2em; color: ${extractionColor};">
                            ${extractionAnalytics.method_used.replace(/_/g, ' ').toUpperCase()}
                        </div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-label">Curve Points Detected</div>
                        <div class="analytics-value">${extractionAnalytics.curve_points_detected || 0}</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-label">Methods Tried</div>
                        <div class="analytics-value">${extractionAnalytics.total_methods_tried || 0}</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-label">Extraction Quality</div>
                        <div class="analytics-value" style="color: ${extractionColor};">${extractionQuality}/8</div>
                    </div>
                </div>
                <div class="recommendation-box" style="margin-top: 15px; padding: 15px; background: white; border-left: 4px solid ${extractionColor};">
                    <strong>📊 Extraction Info:</strong> The system tried ${extractionAnalytics.total_methods_tried || 0} different extraction methods and selected <strong>${extractionAnalytics.method_used.replace(/_/g, ' ')}</strong> as the most accurate method for extracting the spectral curve from your graph image.
                </div>
            </div>
            ` : ''}

            <!-- Analytics Section -->
            <div class="analysis-section">
                <h3>📊 Dynamic Analytics (from all 4 methods)</h3>
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="analytics-label">Average Score</div>
                        <div class="analytics-value">${analytics.average_percentage?.toFixed(2) || 0}%</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-label">Method Agreement</div>
                        <div class="analytics-value">${analytics.agreement_percentage?.toFixed(1) || 0}%</div>
                        <div class="analytics-detail">${analytics.method_agreement_count || 0}/${analytics.total_methods || 4} methods agree</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-label">Confidence Level</div>
                        <div class="analytics-value">${analytics.confidence_level || 'N/A'}</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-label">Unique Predictions</div>
                        <div class="analytics-value">${analytics.unique_predictions || 0}</div>
                    </div>
                </div>
                <div class="recommendation-box" style="margin-top: 15px; padding: 15px; background: #f5f5f5; border-left: 4px solid ${confidenceColor};">
                    <strong>💡 Recommendation:</strong> ${analytics.recommendation || 'N/A'}
                </div>
            </div>

            <!-- Individual Method Results -->
            <div class="analysis-section">
                <h3>🔬 Individual Method Results</h3>
                <div class="methods-comparison">
                    ${Object.entries(methodResults).map(([method, data]) => {
                        const score = Math.round((data.score || 0) * 100);
                        const isBest = method === result.best_method;
                        return `
                        <div class="method-result ${isBest ? 'best-method' : ''}" style="border-left: 4px solid ${isBest ? confidenceColor : '#ddd'};">
                            <div class="method-header">
                                <span class="method-name">${method.toUpperCase()}</span>
                                <span class="method-score" style="color: ${isBest ? confidenceColor : '#666'}">${score}%</span>
                            </div>
                            <div class="method-prediction">
                                <strong>Prediction:</strong> ${data.prediction}
                            </div>
                            <div class="method-metadata">
                                <span><strong>Class:</strong> ${data.metadata?.Class || 'N/A'}</span>
                                <span><strong>Type:</strong> ${data.metadata?.Type || 'N/A'}</span>
                            </div>
                            ${isBest ? '<div class="best-badge">🏆 HIGHEST SCORE</div>' : ''}
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Prediction Details -->
            <div class="analysis-section">
                <h3>🎯 Final Prediction Details</h3>
                <div class="prediction-details">
                    <div class="prediction-item">
                        <span class="prediction-label">Material Name:</span>
                        <span class="prediction-value">${result.best_prediction}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-label">Class:</span>
                        <span class="prediction-value">${result.best_metadata?.Class || 'Unknown'}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-label">Subclass:</span>
                        <span class="prediction-value">${result.best_metadata?.Subclass || 'Unknown'}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-label">Type:</span>
                        <span class="prediction-value">${result.best_metadata?.Type || 'Unknown'}</span>
                    </div>
                </div>
            </div>

            <!-- Matched Graph Comparison -->
            ${result.matched_graph ? `
            <div class="analysis-section" style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 25px; border-radius: 12px;">
                <h3 style="color: #333; margin-bottom: 20px;">📈 Spectral Graph Comparison - Point-by-Point Matching</h3>
                <div class="graph-info" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 5px 0; color: #666;">
                        <strong>Process:</strong>
                        1️⃣ Extract data points from input graph →
                        2️⃣ Match with database spectral points →
                        3️⃣ Predict best result using 4 methods
                    </p>
                    <p style="margin: 5px 0; color: #666;">
                        <strong>Input Points:</strong> ${result.extracted_curve?.wavelength?.length || 0} wavelength-reflectance pairs extracted
                    </p>
                    <p style="margin: 5px 0; color: #666;">
                        <strong>Matched Points:</strong> ${result.matched_graph?.wavelength?.length || 0} wavelength-reflectance pairs from database
                    </p>
                </div>
                <div class="graph-comparison">
                    <div class="graph-container">
                        <h4 style="color: #2196F3; margin-bottom: 10px;">
                            🔵 Input Spectrum (Extracted from Graph)
                        </h4>
                        <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-size: 0.9em;">
                            <strong>X-axis:</strong> Wavelength λ (μm) |
                            <strong>Y-axis:</strong> Reflectance
                        </div>
                        <canvas id="input-graph-canvas"></canvas>
                    </div>
                    <div class="graph-container">
                        <h4 style="color: #4CAF50; margin-bottom: 10px;">
                            🟢 Matched Spectrum: ${result.best_prediction}
                        </h4>
                        <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-size: 0.9em;">
                            <strong>X-axis:</strong> Wavelength λ (μm) |
                            <strong>Y-axis:</strong> Reflectance
                        </div>
                        <canvas id="matched-graph-canvas"></canvas>
                    </div>
                </div>
                <div class="match-quality" style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
                    <strong style="color: ${confidenceColor}; font-size: 1.2em;">
                        Match Quality: ${accuracyScore}% - ${analytics.confidence_level}
                    </strong>
                </div>

                <!-- Overlay Comparison Graph -->
                <div class="graph-container" style="margin-top: 25px; grid-column: 1 / -1;">
                    <h4 style="color: #9C27B0;">🔀 Overlay Comparison - Both Spectra</h4>
                    <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-size: 0.9em; text-align: center;">
                        <span style="color: #2196F3; font-weight: bold;">━━━</span> Input Spectrum &nbsp;&nbsp;|&nbsp;&nbsp;
                        <span style="color: #4CAF50; font-weight: bold;">━━━</span> Matched Spectrum (${result.best_prediction})
                    </div>
                    <canvas id="overlay-graph-canvas"></canvas>
                </div>
            </div>
            ` : ''}

            <!-- Score Distribution -->
            <div class="analysis-section">
                <h3>📊 Score Distribution</h3>
                <div class="score-distribution">
                    <div class="score-range">
                        <span>Min: ${(analytics.min_score * 100)?.toFixed(2) || 0}%</span>
                        <span>Avg: ${analytics.average_percentage?.toFixed(2) || 0}%</span>
                        <span>Max: ${(analytics.max_score * 100)?.toFixed(2) || 0}%</span>
                    </div>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${analytics.average_percentage || 0}%; background: ${confidenceColor};"></div>
                    </div>
                    <div class="score-stats">
                        <span>Range: ${(analytics.score_range * 100)?.toFixed(2) || 0}%</span>
                        <span>Std Dev: ${(analytics.std_deviation * 100)?.toFixed(2) || 0}%</span>
                    </div>
                </div>
            </div>
        </div>
    `;

        // Draw graphs if matched graph data is available
        if (result.matched_graph && result.extracted_curve) {
            setTimeout(() => {
                drawComparisonGraphs(result.extracted_curve, result.matched_graph);
                // Also draw overlay comparison
                drawOverlayGraph(result.extracted_curve, result.matched_graph, result.best_prediction);
            }, 100);
        }

    } catch (error) {
        console.error('Error displaying ensemble results:', error);
        resultsContainer.innerHTML = '<p>Error displaying ensemble results. Please try again.</p>';
    }
}

function drawComparisonGraphs(inputCurve, matchedCurve) {
    // Draw input graph
    const inputCanvas = document.getElementById('input-graph-canvas');
    if (inputCanvas) {
        const ctx = inputCanvas.getContext('2d');
        drawSpectralGraph(ctx, inputCanvas, inputCurve.wavelength, inputCurve.reflectance, '#2196F3');
    }

    // Draw matched graph
    const matchedCanvas = document.getElementById('matched-graph-canvas');
    if (matchedCanvas) {
        const ctx = matchedCanvas.getContext('2d');
        drawSpectralGraph(ctx, matchedCanvas, matchedCurve.wavelength, matchedCurve.reflectance, '#4CAF50');
    }
}

function drawOverlayGraph(inputCurve, matchedCurve, matchedName) {
    const canvas = document.getElementById('overlay-graph-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 450;

    ctx.clearRect(0, 0, width, height);

    // Set up margins
    const margin = { top: 40, right: 30, bottom: 70, left: 70 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Combine wavelengths to find overall range
    const allWavelengths = [...inputCurve.wavelength, ...matchedCurve.wavelength];
    const allReflectances = [...inputCurve.reflectance, ...matchedCurve.reflectance];

    const minWave = Math.min(...allWavelengths);
    const maxWave = Math.max(...allWavelengths);
    const minRefl = Math.min(...allReflectances);
    const maxRefl = Math.max(...allReflectances);

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
        const y = margin.top + (plotHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + plotWidth, y);
        ctx.stroke();

        const reflValue = maxRefl - ((maxRefl - minRefl) / 5) * i;
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(reflValue.toFixed(2), margin.left - 10, y + 4);
    }

    for (let i = 0; i <= 6; i++) {
        const x = margin.left + (plotWidth / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + plotHeight);
        ctx.stroke();

        const waveValue = minWave + ((maxWave - minWave) / 6) * i;
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(waveValue.toFixed(1), x, height - margin.bottom + 20);
    }

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

    // Draw matched curve (green) first (background)
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();

    for (let i = 0; i < matchedCurve.wavelength.length; i++) {
        const x = margin.left + ((matchedCurve.wavelength[i] - minWave) / (maxWave - minWave)) * plotWidth;
        const y = height - margin.bottom - ((matchedCurve.reflectance[i] - minRefl) / (maxRefl - minRefl)) * plotHeight;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw input curve (blue) on top
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();

    for (let i = 0; i < inputCurve.wavelength.length; i++) {
        const x = margin.left + ((inputCurve.wavelength[i] - minWave) / (maxWave - minWave)) * plotWidth;
        const y = height - margin.bottom - ((inputCurve.reflectance[i] - minRefl) / (maxRefl - minRefl)) * plotHeight;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    ctx.globalAlpha = 1.0;

    // Add axis labels
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Wavelength λ (μm)', width / 2, height - 10);

    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Reflectance', 0, 0);
    ctx.restore();

    // Add title
    ctx.fillStyle = '#9C27B0';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Spectral Signature Comparison', width / 2, 20);
}

function drawSpectralGraph(ctx, canvas, wavelengths, reflectances, color) {
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 450;  // Increased height for better visibility

    ctx.clearRect(0, 0, width, height);

    // Set up margins
    const margin = { top: 50, right: 40, bottom: 70, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Find min/max for scaling
    const minWave = Math.min(...wavelengths);
    const maxWave = Math.max(...wavelengths);
    const minRefl = Math.min(...reflectances);
    const maxRefl = Math.max(...reflectances);

    // Add padding to ranges for better visualization
    const reflRange = maxRefl - minRefl;
    const paddedMinRefl = minRefl - reflRange * 0.05;
    const paddedMaxRefl = maxRefl + reflRange * 0.05;

    // Draw white background for plot area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    // Draw grid lines with enhanced styling
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);  // Dashed grid lines

    // Horizontal grid lines (10 lines for finer grid)
    const numHorizontalLines = 10;
    for (let i = 0; i <= numHorizontalLines; i++) {
        const y = margin.top + (plotHeight / numHorizontalLines) * i;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + plotWidth, y);
        ctx.stroke();

        // Y-axis labels (show every other line to avoid crowding)
        if (i % 2 === 0) {
            const reflValue = paddedMaxRefl - ((paddedMaxRefl - paddedMinRefl) / numHorizontalLines) * i;
            ctx.fillStyle = '#444';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(reflValue.toFixed(3), margin.left - 10, y + 4);
        }
    }

    // Vertical grid lines (10 lines for finer grid)
    const numVerticalLines = 10;
    for (let i = 0; i <= numVerticalLines; i++) {
        const x = margin.left + (plotWidth / numVerticalLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + plotHeight);
        ctx.stroke();

        // X-axis labels (show every other line)
        if (i % 2 === 0) {
            const waveValue = minWave + ((maxWave - minWave) / numVerticalLines) * i;
            ctx.fillStyle = '#444';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(waveValue.toFixed(2), x, height - margin.bottom + 20);
        }
    }

    // Reset line dash for axes
    ctx.setLineDash([]);

    // Draw axes (thicker)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = '#000';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';

    // X-axis label
    ctx.fillText('Wavelength λ (μm)', width / 2, height - 10);

    // Y-axis label (rotated)
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Reflectance', 0, 0);
    ctx.restore();

    // Display point range info at top
    ctx.fillStyle = '#2196F3';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Points: ${wavelengths.length} | λ: ${minWave.toFixed(2)}-${maxWave.toFixed(2)} μm | R: ${minRefl.toFixed(3)}-${maxRefl.toFixed(3)}`, margin.left, 20);

    // Draw spectral curve with data points
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const points = [];
    for (let i = 0; i < wavelengths.length; i++) {
        const x = margin.left + ((wavelengths[i] - minWave) / (maxWave - minWave)) * plotWidth;
        const y = height - margin.bottom - ((reflectances[i] - paddedMinRefl) / (paddedMaxRefl - paddedMinRefl)) * plotHeight;
        points.push({ x, y });

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw data points (adaptive sampling based on total points)
    ctx.fillStyle = color;
    let step;
    if (wavelengths.length < 50) {
        step = 1;  // Show all points
    } else if (wavelengths.length < 200) {
        step = Math.floor(wavelengths.length / 50);  // Show ~50 points
    } else {
        step = Math.floor(wavelengths.length / 100);  // Show ~100 points
    }

    for (let i = 0; i < points.length; i += step) {
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, 3.5, 0, 2 * Math.PI);
        ctx.fill();

        // Add white border to points for better visibility
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = color;
    }

    // Always show first and last points
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(points[points.length - 1].x, points[points.length - 1].y, 4, 0, 2 * Math.PI);
    ctx.fill();
}

// Results Display Functions
function displayResults(result) {
    const resultsContainer = document.getElementById('results-container');

    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }

    // Ensure we have valid result data
    if (!result) {
        console.error('No result data provided');
        resultsContainer.innerHTML = '<p>Error: No analysis results available.</p>';
        return;
    }

    // Calculate quality score (0-100)
    const qualityScore = Math.round((result.confidence || 0) * 100);
    const qualityColor = qualityScore >= 80 ? '#4CAF50' :
                        qualityScore >= 60 ? '#FF9800' :
                        qualityScore >= 40 ? '#FF5722' : '#f44336';

    // Generate analysis details based on prediction
    const analysisDetails = generateAnalysisDetails(result);

    try {
        resultsContainer.innerHTML = `
        <div class="analysis-results-container">
            <h2 class="analysis-title">Analysis Results</h2>

            <!-- Quality Score Card -->
            <div class="quality-score-card">
                <div class="quality-label">Quality Score</div>
                <div class="quality-score" style="color: ${qualityColor}">
                    ${qualityScore}/100
                </div>
            </div>

            <!-- Analysis Details -->
            <div class="analysis-details">
                <div class="detail-section">
                    <h3>Material Classification:</h3>
                    <div class="classification-info">
                        <div class="classification-item">
                            <span class="label">Type:</span>
                            <span class="value">${result.predicted_type}</span>
                        </div>
                        <div class="classification-item">
                            <span class="label">Class:</span>
                            <span class="value">${result.predicted_class}</span>
                        </div>
                        <div class="classification-item">
                            <span class="label">Subclass:</span>
                            <span class="value">${result.predicted_subclass}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Analysis Properties:</h3>
                    <div class="properties-list">
                        ${analysisDetails.properties.map(prop => `
                            <div class="property-item">• ${prop}</div>
                        `).join('')}
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Recommendations:</h3>
                    <div class="recommendations-list">
                        ${analysisDetails.recommendations.map(rec => `
                            <div class="recommendation-item">• ${rec}</div>
                        `).join('')}
                    </div>
                </div>

                ${analysisDetails.warnings.length > 0 ? `
                <div class="detail-section warnings">
                    <h3>Warnings:</h3>
                    <div class="warnings-list">
                        ${analysisDetails.warnings.map(warning => `
                            <div class="warning-item">• ${warning}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Analyzed Image -->
            <div class="analyzed-image-section">
                <h3>Analyzed Image:</h3>
                <img src="${result.image_data}" alt="Analyzed Image" class="analyzed-image">
            </div>

            <!-- Matching Spectral Data -->
            <div class="matching-data-section">
                <h3>📊 Related Spectral Data (${result.matching_spectral_data.length} matches):</h3>
                <div class="spectral-matches-grid">
                    ${result.matching_spectral_data.map(match => `
                        <div class="spectral-match-card" onclick="showDataDetail('${match._id}')">
                            <h4>${match.metadata?.Name || 'Unknown Sample'}</h4>
                            <div class="match-details">
                                <p><strong>Type:</strong> ${match.metadata?.Type || 'N/A'}</p>
                                <p><strong>Class:</strong> ${match.metadata?.Class || 'N/A'}</p>
                                <p><strong>Origin:</strong> ${match.metadata?.Origin || 'Unknown'}</p>
                                <p><strong>Sample ID:</strong> ${match.metadata?.['Sample No.'] || 'N/A'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error displaying results:', error);
        resultsContainer.innerHTML = '<p>Error displaying analysis results. Please try again.</p>';
    }
}

function generateAnalysisDetails(result) {
    const type = result.predicted_type.toLowerCase();
    const confidence = result.confidence;

    let properties = [];
    let recommendations = [];
    let warnings = [];

    // Generate properties based on material type
    if (type === 'rock') {
        properties = [
            'Geological formation identified',
            'Mineral composition analysis available',
            'Suitable for geological studies',
            'Natural crystalline structure detected'
        ];
        recommendations = [
            'Store in dry environment',
            'Handle with care to preserve structure',
            'Suitable for further spectral analysis',
            'Can be used for educational purposes'
        ];
    } else if (type === 'mineral') {
        properties = [
            'Pure mineral composition detected',
            'High crystalline structure',
            'Suitable for spectroscopic analysis',
            'Natural formation confirmed'
        ];
        recommendations = [
            'Store in controlled environment',
            'Avoid exposure to moisture',
            'Ideal for research applications',
            'Preserve for future analysis'
        ];
    } else if (type === 'vegetation') {
        properties = [
            'Organic material detected',
            'Chlorophyll content present',
            'Natural plant structure',
            'Biodegradable composition'
        ];
        recommendations = [
            'Process quickly to avoid degradation',
            'Store in refrigerated conditions',
            'Suitable for biological studies',
            'Monitor for freshness indicators'
        ];
    } else if (type === 'manmade') {
        properties = [
            'Artificial material composition',
            'Engineered structure detected',
            'Industrial processing evident',
            'Synthetic material properties'
        ];
        recommendations = [
            'Check for safety specifications',
            'Verify material composition',
            'Follow handling guidelines',
            'Consider environmental impact'
        ];
    } else {
        properties = [
            'Material composition analyzed',
            'Spectral signature recorded',
            'Physical properties documented',
            'Classification completed'
        ];
        recommendations = [
            'Store according to material type',
            'Follow standard handling procedures',
            'Suitable for further analysis',
            'Document findings for reference'
        ];
    }

    // Add confidence-based warnings
    if (confidence < 0.5) {
        warnings.push('Low confidence prediction - manual verification recommended');
    }
    if (confidence < 0.3) {
        warnings.push('Very low confidence - consider retaking image with better lighting');
    }

    return { properties, recommendations, warnings };
}

// History Management Functions
async function loadHistory(page = 1) {
    try {
        const response = await fetch(`${API_BASE}/history?page=${page}&per_page=10`);
        const data = await response.json();

        displayHistory(data.history);
        displayHistoryPagination(data.pagination);

    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('history-list').innerHTML = '<p>Error loading history.</p>';
    }
}

function displayHistory(historyItems) {
    const historyList = document.getElementById('history-list');

    if (!historyList) {
        console.error('History list element not found');
        return;
    }

    if (!historyItems || historyItems.length === 0) {
        historyList.innerHTML = '<p>No prediction history found.</p>';
        return;
    }

    historyList.innerHTML = historyItems.map(item => {
        // Handle different analysis types
        let title, subtitle, confidence, analysisType, itemId;

        if (item.analysis_type === 'advanced_spectral') {
            // Advanced spectral analysis
            const prediction = item.advanced_results?.prediction || {};
            title = `${prediction.type || 'Unknown'} - ${prediction.class || 'Unknown'}`;
            subtitle = `${prediction.subclass || 'N/A'}`;
            confidence = ((item.best_score || 0) * 100).toFixed(1);
            analysisType = '🔬 Advanced';
            itemId = item.analysis_id;
        } else if (item.analysis_type === 'graph_similarity') {
            // Graph similarity analysis
            title = 'Spectral Graph Analysis';
            subtitle = `${item.similar_spectra_count || 0} matches found`;
            confidence = ((item.best_similarity_score || 0) * 100).toFixed(1);
            analysisType = '📊 Graph';
            itemId = item.analysis_id;
        } else {
            // Regular image analysis
            title = `${item.predicted_type || 'Unknown'} - ${item.predicted_class || 'Unknown'}`;
            subtitle = `${item.predicted_subclass || 'N/A'}`;
            confidence = ((item.confidence || 0) * 100).toFixed(1);
            analysisType = '📷 Image';
            itemId = item.id;
        }

        const thumbnailSrc = item.thumbnail || item.image_data || '/placeholder.jpg';

        return `
            <div class="history-item" onclick="showHistoryDetail('${itemId}', '${item.analysis_type || 'image'}')">
                <img src="${thumbnailSrc}" alt="Thumbnail" class="history-thumbnail">
                <div class="history-info">
                    <div class="analysis-type-badge">${analysisType}</div>
                    <h4>${title}</h4>
                    <p>Details: ${subtitle}</p>
                    <p>
                        <span class="confidence-badge">${confidence}%</span>
                    </p>
                </div>
                <div class="history-meta">
                    <p>${new Date(item.timestamp).toLocaleDateString()}</p>
                    <p>${new Date(item.timestamp).toLocaleTimeString()}</p>
                    <button class="btn danger" onclick="event.stopPropagation(); deleteHistoryItem('${itemId}', '${item.analysis_type || 'image'}')" style="margin-top: 5px; padding: 4px 8px; font-size: 0.8em;">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function displayHistoryPagination(pagination) {
    const container = document.getElementById('history-pagination');
    const { page, pages } = pagination;

    let paginationHTML = '';

    if (page > 1) {
        paginationHTML += `<button onclick="loadHistory(${page - 1})">Previous</button>`;
    }

    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
        paginationHTML += `<button class="${i === page ? 'active' : ''}" onclick="loadHistory(${i})">${i}</button>`;
    }

    if (page < pages) {
        paginationHTML += `<button onclick="loadHistory(${page + 1})">Next</button>`;
    }

    container.innerHTML = paginationHTML;
}

async function showHistoryDetail(itemId, analysisType = 'image') {
    try {
        // For advanced and graph analysis, we need to find by analysis_id
        let response;
        if (analysisType === 'advanced_spectral' || analysisType === 'graph_similarity') {
            // Search for the analysis by analysis_id
            response = await fetch(`${API_BASE}/history?page=1&per_page=100`);
            const historyData = await response.json();

            if (response.ok) {
                const item = historyData.history.find(h => h.analysis_id === itemId);
                if (item) {
                    if (analysisType === 'advanced_spectral') {
                        displayAdvancedResults(item.advanced_results);
                    } else {
                        displayGraphResults(item);
                    }
                    showResults();
                } else {
                    throw new Error('Analysis not found');
                }
            } else {
                throw new Error('Failed to load history');
            }
        } else {
            // Regular image analysis
            response = await fetch(`${API_BASE}/history/${itemId}`);
            const prediction = await response.json();

            if (response.ok) {
                displayResults(prediction);
                showResults();
            } else {
                throw new Error(prediction.error || 'Failed to load prediction details');
            }
        }

    } catch (error) {
        console.error('Error loading history detail:', error);
        alert('Error loading details: ' + error.message);
    }
}

async function deleteHistoryItem(itemId, analysisType = 'image') {
    if (!confirm('Are you sure you want to delete this analysis?')) {
        return;
    }

    try {
        let response;
        if (analysisType === 'advanced_spectral' || analysisType === 'graph_similarity') {
            // For advanced/graph analysis, we need to delete by analysis_id
            // Since there's no direct endpoint, we'll need to implement this in backend
            // For now, show a message
            alert('Advanced analysis deletion will be implemented in backend. Please use clear all history for now.');
            return;
        } else {
            // Regular image analysis
            response = await fetch(`${API_BASE}/history/${itemId}`, {
                method: 'DELETE'
            });
        }

        if (response.ok) {
            loadHistory(); // Reload current page
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete analysis');
        }

    } catch (error) {
        console.error('Error deleting analysis:', error);
        alert('Error deleting analysis: ' + error.message);
    }
}

async function clearAllHistory() {
    if (!confirm('Are you sure you want to clear all prediction history? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/history/clear`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadHistory(); // Reload to show empty state
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to clear history');
        }

    } catch (error) {
        console.error('Error clearing history:', error);
        alert('Error clearing history: ' + error.message);
    }
}

// Search on Enter key
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchData();
            }
        });
    }
});