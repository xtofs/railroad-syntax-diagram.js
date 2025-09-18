# Railroad Diagram Library

A JavaScript library for generating [railroad syntax diagrams](https://en.wikipedia.org/wiki/Syntax_diagram) with clean SVG output and professional styling.

![Railroad Diagram Example](example-diagram.png)

## Quick Start

The library uses a standalone global API that works with file:// protocol - no local server required!

### CDN Usage (Recommended)

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/xtofs/railroad-syntax-diagram.js@0.0.1/diagram.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/xtofs/railroad-syntax-diagram.js@0.0.1/diagram.css">
</head>
<body>
    <!-- Define diagrams using script tags -->
    <script type="text/railroad" data-rule="expression">
        sequence(
            textBox("term", "nonterminal"),
            bypass(sequence(
                textBox("\"+\"", "terminal"),
                textBox("expression", "nonterminal")
            ))
        )
    </script>

    <script>
        // Render diagrams when page loads
        document.addEventListener('DOMContentLoaded', function() {
            window.RailroadDiagrams.renderDiagramScripts();
        });
    </script>
</body>
</html>
```

### Local Development

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="diagram.js"></script>
    <link rel="stylesheet" href="diagram.css">
</head>
<body>
    <!-- Define diagrams using script tags -->
    <script type="text/railroad" data-rule="expression">
        sequence(
            textBox("term", "nonterminal"),
            bypass(sequence(
                textBox("\"+\"", "terminal"),
                textBox("expression", "nonterminal")
            ))
        )
    </script>

    <script>
        // Render diagrams when page loads
        document.addEventListener('DOMContentLoaded', function() {
            window.RailroadDiagrams.renderDiagramScripts();
        });
    </script>
</body>
</html>
```

### CDN Versioning

- **Latest stable**: `@0.0.1` (recommended for production)
- **Development**: `@main` (latest commit, may break)
- **Specific commit**: `@commit-hash` (ultimate stability)
    <script type="text/railroad" data-rule="sql-select">
        sequence(
            textBox("SELECT", "keyword"),
            stack(
                textBox("*", "operator"),
                textBox("column_name", "identifier")
            ),
            textBox("FROM", "keyword"),
            textBox("table_name", "identifier")
        )
    </script>

    <script>
        // Render diagrams when page loads
        document.addEventListener('DOMContentLoaded', function() {
            window.RailroadDiagrams.renderDiagramScripts();
        });
    </script>
</body>
</html>
```

## Features

- **File:// compatibility**: Works without a local server - just open HTML files directly
- **Traditional styling**: Black start/end terminals, clean rail connections
- **Consistent alignment**: All elements follow a structured layout system
- **Clean API**: Declarative syntax accessible via `window.RailroadDiagrams`
- **Professional output**: SVG with proper stroke handling and visual polish
- **CSS-driven sizing**: Unified configuration via CSS custom properties
- **Debug features**: Optional grid display and layout bounding boxes
- **Security validation**: Expression code is validated to prevent code injection
- **TypeScript support**: Complete type definitions for the global API

## API Reference

### Global API Access

All functionality is available through the global `window.RailroadDiagrams` object:

```javascript
const { textBox, sequence, stack, bypass, loop } = window.RailroadDiagrams.Expression;
const { TrackBuilder, Diagram } = window.RailroadDiagrams;
```

### Core Functions

- **`textBox(text, className)`**: Creates terminal or non-terminal elements.
- **`sequence(...elements)`**: Arranges elements horizontally with connecting rails.
- **`stack(...elements)`**: Creates vertical alternatives with branching rails.
- **`loop(...elements)`**: Creates a loop around an expression.
- **`bypass(...elements)`**: Creates a bypass around an expression.

### CSS Classes

- `terminal`: Light gray styling for literal text and keywords
- `nonterminal`: Darker gray styling with underlined text for rule references (clickable)

### Interactive Features

- **Click Navigation**: Click on any nonterminal (underlined text) to jump to its rule definition
- **Anchor-based Navigation**: Nonterminals navigate to elements with `id="syntax-rule-${ruleName}"`
- **Hover Effects**: Nonterminals show visual feedback on hover
- **Instant Scrolling**: Navigation uses instant scrolling (not animated)

```html
<!-- Clicking "expression" nonterminals will jump to this div -->
<div class="syntax-rule" id="syntax-rule-expression">
    <h2>expression</h2>
    <script type="text/railroad" data-rule="expression">
        sequence(textBox("term", "nonterminal"), /* ... */)
    </script>
</div>

<!-- Clicking "term" nonterminals will jump to this div -->
<div class="syntax-rule" id="syntax-rule-term">
    <h2>term</h2>
    <script type="text/railroad" data-rule="term">
        sequence(textBox("factor", "nonterminal"), /* ... */)
    </script>
</div>
```

### Debug Features

The library provides optional visual debugging tools:

- **`showGrid`**: Displays a background grid with small crosses at grid points to visualize the layout system
- **`showBounds`**: Shows pink dashed bounding boxes around each element and dotted baseline indicators

```javascript
// Enable debug features
window.RailroadDiagrams.renderDiagramScripts({ 
    showGrid: true,     // Show background grid
    showBounds: true    // Show layout bounding boxes
});
```

### Security Features

The library includes validation to prevent code injection attacks through expression scripts:

- **Function Allowlist**: Only `textBox`, `sequence`, `stack`, `bypass`, and `loop` functions are permitted
- **Character Validation**: Expressions can only contain safe characters (letters, numbers, quotes, parentheses, etc.)
- **Dangerous Pattern Detection**: Blocks common attack vectors like `eval()`, `fetch()`, `document.`, etc.

```html
<!-- ✅ Safe - will render correctly -->
<script type="text/railroad" data-rule="safe">
    sequence(textBox("SELECT", "keyword"), textBox("*", "operator"))
</script>

<!-- ❌ Blocked - will throw validation error -->
<script type="text/railroad" data-rule="malicious">
    eval('alert("XSS")'), textBox("fake", "terminal")
</script>
```

All validation errors are logged to the console and display an error message instead of rendering the diagram.

### Sizing Configuration

The library uses CSS custom properties for coordinated sizing configuration. All parameters are automatically synchronized.

| Size            | Grid Size | Font Size | Rail Tracks | Text Borders | Use Case                             |
|-----------------|-----------|-----------|-------------|--------------|--------------------------------------|
| **Compact**     | 12px      | 10px      | 4px         | 2px          | Dense documentation, small spaces    |
| **Small**       | 14px      | 12px      | 5px         | 2px          | Technical docs, inline diagrams      |
| **Medium**      | 16px      | 14px      | 6px         | 3px          | **Default** - balanced for web pages |
| **Large**       | 20px      | 16px      | 7px         | 3px          | Presentations, better readability    |
| **Extra Large** | 24px      | 18px      | 8px         | 4px          | Posters, large displays              |

**Configuration via CSS Custom Properties:**

```css
/* Override the default Medium preset */
:root {
    --rail-grid-size: 20px;      /* Large preset */
    --rail-font-size: 16px;
    --rail-track-width: 7px;
    --rail-text-border: 3px;
}
```

**JavaScript (automatically reads sizing from CSS):**

```javascript
// Simple usage - sizing comes from CSS custom properties
window.RailroadDiagrams.renderDiagramScripts();

// Optional debug features
window.RailroadDiagrams.renderDiagramScripts({ 
    showGrid: true,     // Show background grid
    showBounds: true    // Show layout bounding boxes
});
```

**Advanced: Override for specific containers:**

```css
.compact-diagrams {
    --rail-grid-size: 12px;
    --rail-font-size: 10px;
    --rail-track-width: 4px;
    --rail-text-border: 2px;
}
```

## Usage Example

```javascript
// Access the API from the global object
const { textBox, sequence, stack } = window.RailroadDiagrams.Expression;
const { Diagram } = window.RailroadDiagrams;

// Create diagram (grid size from CSS, with debug features)
const diagram = new Diagram("diagram-container", 24, true, true);

// Build complex expressions
const expr = sequence(
    textBox("START", "terminal"),
    stack(
        textBox("option1", "nonterminal"),
        textBox("option2", "nonterminal"), 
        textBox("option3", "nonterminal")
    ),
    textBox("END", "terminal")
);

// Add to diagram
diagram.addRule("Example Rule", expr);
```

## Architecture Overview

The library is built as a standalone JavaScript file with a global API that contains three main components:

### 1. TrackBuilder

A turtle graphics API for generating SVG paths with fluent interface:

- **Direction System**: Object.freeze constants (EAST=0, SOUTH=1, WEST=2, NORTH=3)
- **Fluent API**: `start()` → `forward()` → `turnLeft()`/`turnRight()` → `finish()`
- **Path Generation**: Creates SVG paths using relative commands (h/v for lines, a for arcs)
- **Quarter-Circle Turns**: Precise 90° arcs with 1-unit radius for smooth connections
- **Debug Support**: Tracks command sequences via data-seq attributes for troubleshooting

### 2. Expression System

Factory methods for creating railroad diagram elements with strict grid alignment:

#### Core Elements

- **`textBox(text, className)`**: Terminal/non-terminal text-boxes with rail connectors
- **`sequence(...children)`**: Horizontal layout with 1-unit spacing between elements  
- **`stack(...children)`**: Vertical branching alternatives with symmetric rail routing

#### Design Invariants

1. **Horizontal Grid Alignment**: All widths must be even numbers (grid units) for perfect centering
2. **Vertical Grid Alignment**: All heights and spacing must be integers (grid units)
3. **Rail Drawing Boundaries**: Elements draw rails within their own boundaries, never overlapping children's edges

### 3. Diagram Container

Manages the overall SVG canvas with grid system and rule rendering:

- **Grid System**: CSS-driven grid size with optional visual background grid
- **Rule Management**: Multiple named diagram rules with automatic layout
- **Debug Features**: Optional grid display (`showGrid`) and layout bounding boxes (`showBounds`)

## Key Technical Discoveries

### Stack Rail Routing Logic

Complex branching and merging paths for alternative elements:

**Branch Rails (Left Side)**:

- Start at main line connection point facing east
- Turn right (south) immediately - no horizontal movement to non-existent branch points
- Forward south to child baseline (minus 2 for turn radii compensation)
- Turn left (east) to face child
- Forward east to connect to child's left edge

**Merge Rails (Right Side)**:

- Start at main line right connection point facing west toward children
- Turn left (south) to go down toward child's baseline  
- Forward south to reach child's baseline (minus 2 for turn radii compensation)
- Turn right (west) to face toward main line
- Forward west to connect to child's right edge

### CSS Stroke Management

Critical styling for precise rail rendering:

- **`stroke-linecap: butt`**: Rails end exactly at coordinates without extension
- **`fill: none`**: Prevents SVG triangular fill artifacts
- **Semi-transparent rails**: `opacity: 0.7` for debugging overlapping paths

### Grid Alignment Mathematics

- **Turn Radius Compensation**: Quarter-circle turns add +1 to both x and y, requiring -2 distance compensation
- **Even Width Requirement**: Ensures perfect centering without fractional coordinates
- **Baseline Consistency**: All elements maintain consistent baseline positioning for rail connections

## JavaScript Examples

```javascript
// Access the API from the global object
const { textBox, sequence, stack } = window.RailroadDiagrams.Expression;
const { Diagram } = window.RailroadDiagrams;

// Create diagram (grid size from CSS, with debug features)
const diagram = new Diagram("diagram-container", 24, true, true);

// Build complex expressions
const expr = sequence(
    textBox("START", "terminal"),
    stack(
        textBox("option1", "nonterminal"),
        textBox("option2", "nonterminal"), 
        textBox("option3", "nonterminal")
    ),
    textBox("END", "terminal")
);

// Add to diagram
diagram.addRule("Example Rule", expr);
```

## Development Requirements

- **Any modern browser** with ES6 support
- **D3.js v7** (loaded via CDN)
- **No server required** - works with file:// protocol

## File Structure

```text
├── index.html                 # Main demo page
├── diagram.js                 # Complete standalone library (IIFE/Global API)
├── diagram.d.ts              # TypeScript definitions for global API
├── diagram.css               # SVG styling with precise stroke control
└── README.md                 # This documentation
```

## Setup Instructions

1. Download the library files
2. Include D3.js v7 from CDN in your HTML
3. Include `diagram.js` and `diagram.css`
4. Open HTML files directly in browser - no server required!

## Future Extensions

The system is designed to support additional railroad diagram elements:

- **Loops**: Backward-pointing optional repetition paths
- **Bypasses**: Forward-pointing optional skip paths  
- **Complex Routing**: Multi-level nesting and custom path geometries

All extensions will maintain the core grid alignment invariants and rail boundary rules established in the current architecture.
