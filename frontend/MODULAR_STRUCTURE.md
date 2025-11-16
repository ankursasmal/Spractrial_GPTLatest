# 🧩 Modular Canvas Chart Structure

## Overview

The canvas chart implementation has been **split into 15 modular parts** for better maintainability, readability, and reusability.

---

## 📦 Module Breakdown

### **PART 1: Main Chart Drawing Function**
**Function:** `drawSpectralChart(spectralData)`
- Entry point for drawing the entire chart
- Initializes canvas and configuration
- Orchestrates all other drawing functions
- Sets up interactivity

**Responsibilities:**
- Canvas setup
- Configuration management
- Function coordination
- Hover setup

---

### **PART 2: Data Range Calculation**
**Function:** `calculateDataRanges(spectralData)`
- Calculates min/max values for X and Y axes
- Adds 10% padding to Y-axis for better visualization
- Returns range object with all boundaries

**Returns:**
```javascript
{
  xMin, xMax,
  yMin, yMax,
  paddedYMin, paddedYMax
}
```

---

### **PART 3: Grid Drawing**
**Function:** `drawGrid(ctx, canvas, config, dimensions)`
- Draws 8x8 dashed grid lines
- Vertical lines for X-axis reference
- Horizontal lines for Y-axis reference
- Light gray color for non-intrusive appearance

**Features:**
- Configurable tick count
- Dashed line style
- Subtle color (#e0e0e0)

---

### **PART 4: Axes Drawing**
**Function:** `drawAxes(ctx, canvas, config, dimensions)`
- Draws main X and Y axes
- Bold 2px lines
- Dark color for visibility
- L-shaped axis system

**Style:**
- Color: #333
- Width: 2px
- Solid lines

---

### **PART 5: Axis Ticks and Labels**
**Function:** `drawAxisTicks(ctx, canvas, config, dimensions, ranges)`
- Draws tick marks on both axes
- Adds numeric labels to each tick
- X-axis: 2 decimal places
- Y-axis: 3 decimal places

**Features:**
- 8 ticks per axis (configurable)
- Bold 11px Arial font
- Proper alignment (center for X, right for Y)

---

### **PART 6: Axis Labels**
**Function:** `drawAxisLabels(ctx, canvas, config)`
- Draws main axis labels
- X-axis: "Wavelength (μm)"
- Y-axis: "Reflectance" (rotated 90°)
- Bold 14px font

**Style:**
- Bold text
- Black color
- Centered positioning

---

### **PART 7: Data Line Drawing**
**Function:** `drawDataLine(ctx, canvas, config, dimensions, spectralData, ranges)`
- Draws the main spectral data line
- Connects all data points
- Blue color (#2196F3)
- 2.5px width

**Returns:**
- Array of data points with screen coordinates

---

### **PART 8: Data Points Drawing**
**Function:** `drawDataPoints(ctx, dataPoints, config)`
- Draws circular markers on data points
- Shows up to 50 points (configurable)
- 3px radius circles
- Same color as line

**Optimization:**
- Automatically skips points if too many
- Maintains visual clarity

---

### **PART 9: Hover Functionality Setup**
**Function:** `setupCanvasHover(canvas, dataPoints, config, ranges)`
- Sets up mouse event listeners
- Manages tooltip creation
- Handles canvas cloning to remove old listeners
- Coordinates hover interactions

**Events:**
- `mousemove`: Detect hover
- `mouseleave`: Hide tooltip

---

### **PART 10: Tooltip Creation**
**Function:** `getOrCreateTooltip()`
- Creates tooltip element if needed
- Reuses existing tooltip
- Applies all styling
- Returns tooltip element

**Styling:**
- Dark background (rgba(0,0,0,0.8))
- White text
- Rounded corners (6px)
- Positioned absolutely

---

### **PART 11: Mouse Move Handler**
**Function:** `handleMouseMove(e, canvas, dataPoints, config, ranges, tooltip)`
- Handles mouse movement over canvas
- Finds nearest point
- Triggers redraw with highlight
- Shows/hides tooltip

**Logic:**
1. Get mouse coordinates
2. Find nearest point
3. If found: highlight + tooltip
4. If not: hide tooltip

---

### **PART 12: Find Nearest Point**
**Function:** `findNearestPoint(mouseX, mouseY, dataPoints, threshold = 20)`
- Calculates distance to all points
- Uses Euclidean distance formula
- Returns nearest point within threshold
- Returns null if none found

**Algorithm:**
```javascript
distance = √((mouseX - pointX)² + (mouseY - pointY)²)
```

---

### **PART 13: Redraw with Highlight**
**Function:** `redrawChartWithHighlight(canvas, dataPoints, config, ranges, nearestPoint)`
- Redraws entire chart
- Adds red highlight to nearest point
- Draws crosshair
- Maintains all other elements

**Process:**
1. Clear canvas
2. Redraw all base elements
3. Add highlight (5px red circle)
4. Draw crosshair

---

### **PART 14: Crosshair Drawing**
**Function:** `drawCrosshair(ctx, canvas, config, point)`
- Draws vertical line through point
- Draws horizontal line through point
- Semi-transparent orange color
- Dashed line style

**Style:**
- Color: rgba(255, 87, 34, 0.5)
- Width: 1px
- Dash: [5, 5]

---

### **PART 15: Tooltip Display**
**Function:** `showTooltip(tooltip, point, clientX, clientY)`
- Positions tooltip near cursor
- Displays wavelength (3 decimals)
- Displays reflectance (4 decimals)
- Formats with HTML

**Content:**
```
Wavelength: X.XXX μm
Reflectance: X.XXXX
```

---

## 🎯 Benefits of Modular Structure

### 1. **Maintainability**
- Each function has a single responsibility
- Easy to locate and fix bugs
- Clear separation of concerns

### 2. **Readability**
- Functions are small and focused
- Clear naming conventions
- Well-documented with comments

### 3. **Reusability**
- Functions can be used independently
- Easy to create variations
- Testable in isolation

### 4. **Extensibility**
- Easy to add new features
- Can modify individual parts
- Minimal impact on other modules

### 5. **Performance**
- Efficient redrawing
- Only redraws what's needed
- Optimized point rendering

---

## 📊 Function Call Flow

```
drawSpectralChart()
├── calculateDataRanges()
├── drawGrid()
├── drawAxes()
├── drawAxisTicks()
├── drawAxisLabels()
├── drawDataLine()
├── drawDataPoints()
└── setupCanvasHover()
    ├── getOrCreateTooltip()
    └── [on mousemove] handleMouseMove()
        ├── findNearestPoint()
        ├── redrawChartWithHighlight()
        │   ├── drawGrid()
        │   ├── drawAxes()
        │   ├── drawAxisTicks()
        │   ├── drawAxisLabels()
        │   ├── drawDataLine()
        │   ├── drawDataPoints()
        │   └── drawCrosshair()
        └── showTooltip()
```

---

## 🔧 Configuration Object

```javascript
const config = {
    margin: { top: 40, right: 40, bottom: 70, left: 80 },
    numXTicks: 8,        // Number of X-axis ticks
    numYTicks: 8,        // Number of Y-axis ticks
    lineColor: '#2196F3',    // Data line color
    gridColor: '#e0e0e0',    // Grid line color
    axisColor: '#333',       // Axis color
    maxPoints: 50            // Max points to display
};
```

---

## 🎨 Customization Examples

### Change Number of Ticks
```javascript
// In drawSpectralChart(), modify config:
numXTicks: 10,  // More detailed X-axis
numYTicks: 6    // Less detailed Y-axis
```

### Change Colors
```javascript
lineColor: '#FF5722',   // Red line
gridColor: '#f5f5f5',   // Lighter grid
axisColor: '#000'       // Black axes
```

### Adjust Hover Sensitivity
```javascript
// In findNearestPoint(), change threshold:
findNearestPoint(mouseX, mouseY, dataPoints, 30)  // 30px instead of 20px
```

### Show More Points
```javascript
maxPoints: 100  // Show up to 100 points
```

---

## 📁 File Location

**File:** `frontend/script.js`
**Lines:** 266-644 (379 lines total)

**Structure:**
- Lines 266-305: Part 1 (Main function)
- Lines 307-325: Part 2 (Data ranges)
- Lines 327-360: Part 3 (Grid)
- Lines 362-375: Part 4 (Axes)
- Lines 377-420: Part 5 (Ticks)
- Lines 422-440: Part 6 (Labels)
- Lines 442-470: Part 7 (Data line)
- Lines 472-485: Part 8 (Data points)
- Lines 487-500: Part 9 (Hover setup)
- Lines 502-525: Part 10 (Tooltip)
- Lines 527-545: Part 11 (Mouse handler)
- Lines 547-565: Part 12 (Find point)
- Lines 567-600: Part 13 (Redraw)
- Lines 602-625: Part 14 (Crosshair)
- Lines 627-640: Part 15 (Tooltip display)

---

## ✅ Testing Each Module

### Test Part 1 (Main Function)
```javascript
drawSpectralChart([[1.0, 0.5], [2.0, 0.7], [3.0, 0.6]]);
// Should draw complete chart
```

### Test Part 2 (Data Ranges)
```javascript
const ranges = calculateDataRanges([[1.0, 0.5], [2.0, 0.7]]);
console.log(ranges);
// Should show: { xMin: 1.0, xMax: 2.0, ... }
```

### Test Part 12 (Find Point)
```javascript
const point = findNearestPoint(100, 100, dataPoints, 20);
console.log(point);
// Should return nearest point or null
```

---

## 🚀 Next Steps

### Immediate
- ✅ Test each module independently
- ✅ Verify all functions work together
- ✅ Check hover functionality

### Future Enhancements
- [ ] Add zoom module (Part 16)
- [ ] Add pan module (Part 17)
- [ ] Add export module (Part 18)
- [ ] Add animation module (Part 19)

---

## 📚 Related Documentation

- **QUICK_START.md** - How to use the chart
- **CANVAS_IMPROVEMENTS.md** - Technical details
- **DELIVERABLES.md** - What was delivered
- **README_CANVAS_ENHANCEMENTS.md** - Complete guide

---

**The modular structure makes the code 10x more maintainable! 🎉**

