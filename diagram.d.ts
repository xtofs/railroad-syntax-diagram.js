// railroad-diagrams.d.ts
// Type definitions for Railroad Diagrams Library (Global API)

declare namespace RailroadDiagrams {
    /**
     * Direction constants for track building
     */
    interface Direction {
        readonly NORTH: 'north';
        readonly SOUTH: 'south';
        readonly EAST: 'east';
        readonly WEST: 'west';
    }

    /**
     * Layout box interface for diagram elements
     */
    interface LayoutBox {
        /** Width in grid units */
        width: number;
        /** Height in grid units */
        height: number;
        /** Baseline Y position in grid units */
        baselineY: number;
        /** Render method */
        render(group: any, trackBuilder: TrackBuilder, renderChild: RenderChildFunction): void;
    }

    /**
     * Function type for rendering child elements
     */
    type RenderChildFunction = (child: LayoutBox, x: number, y: number) => void;

    /**
     * TrackBuilder class for creating SVG railroad tracks using turtle graphics
     */
    class TrackBuilder {
        /** Grid size in pixels */
        readonly gridSize: number;
        
        /**
         * Create a TrackBuilder instance
         * @param group - D3 selection of the SVG group element
         * @param gridSize - Grid size in pixels
         */
        constructor(group: any, gridSize: number);
        
        /**
         * Start a new track at the specified position
         * @param x - X coordinate in grid units
         * @param y - Y coordinate in grid units
         * @param direction - Initial direction
         */
        start(x: number, y: number, direction: keyof Direction): TrackBuilder;
        
        /**
         * Move forward in the current direction
         * @param distance - Distance to move in grid units
         */
        forward(distance: number): TrackBuilder;
        
        /**
         * Turn left (counterclockwise)
         */
        turnLeft(): TrackBuilder;
        
        /**
         * Turn right (clockwise)
         */
        turnRight(): TrackBuilder;
        
        /**
         * Finish the current track and add it to the SVG
         * @param className - CSS class for the track
         * @param id - Optional ID for the track element
         */
        finish(className?: string, id?: string): TrackBuilder;

        /**
         * Clear all rails from the group
         */
        clearRails(): void;

        /**
         * Get current position and direction
         */
        getCurrentPosition(): { x: number; y: number; direction: keyof Direction };
    }

    /**
     * Diagram class for managing SVG railroad diagrams
     */
    class Diagram {
        /**
         * Create a Diagram instance
         * @param containerId - Container element ID or element reference
         * @param gridSize - Grid size in pixels
         * @param debugMode - Enable debug mode
         */
        constructor(containerId: string | HTMLElement, gridSize: number, debugMode?: boolean);
        
        /**
         * Add a rule to the diagram
         * @param title - Rule title
         * @param expression - Expression layout box
         */
        addRule(title: string, expression: LayoutBox): void;
    }

    /**
     * Expression factory methods for creating diagram elements
     */
    class Expression {
        /**
         * Create a text box (terminal or non-terminal)
         * @param text - Text content
         * @param className - CSS class ("terminal" or "nonterminal")
         */
        static textBox(text: string, className: string): LayoutBox;
        
        /**
         * Create a sequence of elements laid out horizontally
         * @param children - Elements to sequence
         */
        static sequence(...children: LayoutBox[]): LayoutBox;
        
        /**
         * Create a stack of alternative elements laid out vertically
         * @param children - Elements to stack
         */
        static stack(...children: LayoutBox[]): LayoutBox;
        
        /**
         * Create a bypass around an element (optional path above)
         * @param child - Element to bypass
         */
        static bypass(child: LayoutBox): LayoutBox;
        
        /**
         * Create a loop around an element (optional repetition path above)
         * @param child - Element to loop
         */
        static loop(child: LayoutBox): LayoutBox;
    }

    /**
     * Configuration for rendering diagrams
     */
    interface RenderConfig {
        /** Container element ID or element reference */
        containerId: string | HTMLElement;
        /** JavaScript expression code */
        expressionCode: string;
        /** Rule name */
        ruleName: string;
        /** Grid size in pixels (default: 24) */
        gridSize?: number;
        /** Enable debug mode (default: false) */
        debugMode?: boolean;
    }

    /**
     * Configuration for automatic script rendering
     */
    interface ScriptRenderConfig {
        /** Grid size in pixels (default: 24) */
        gridSize?: number;
        /** Enable debug mode (default: false) */
        debugMode?: boolean;
    }

    /**
     * Render a single railroad diagram
     * @param config - Render configuration
     */
    function renderRailroadDiagram(config: RenderConfig): Diagram;

    /**
     * Automatically discover and render all diagram script tags
     * @param config - Script render configuration
     */
    function renderDiagramScripts(config?: ScriptRenderConfig): void;
}

/**
 * Global Railroad Diagrams API
 */
declare const RailroadDiagrams: {
    Direction: RailroadDiagrams.Direction;
    TrackBuilder: typeof RailroadDiagrams.TrackBuilder;
    Diagram: typeof RailroadDiagrams.Diagram;
    Expression: typeof RailroadDiagrams.Expression;
    renderRailroadDiagram: typeof RailroadDiagrams.renderRailroadDiagram;
    renderDiagramScripts: typeof RailroadDiagrams.renderDiagramScripts;
};

/**
 * Window interface extension for global access
 */
declare interface Window {
    RailroadDiagrams: typeof RailroadDiagrams;
}