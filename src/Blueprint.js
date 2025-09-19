const Blueprint = {

    BLUEPRINTS: {
        CELL: ["1"],
        SAMPLE: [
            "4333334",
            "0335530", 
            "0334430",
            "0434434",
        ],
        TWO_BY_TWO: [ "22", "22" ],
        THREE_BY_THREE: [ "333", "333", "333" ],
        TOWER: ["4"],
        TWO_BY_TWO_TOWER: [ "55", "55"]
    },

    getRandomBlueprint(x, y) {
        const blueprintKeys = Object.keys(this.BLUEPRINTS);
        const hash = Math.abs(((x * 73836093) ^ (y * 19379663))) % blueprintKeys.length;
        return this.BLUEPRINTS[blueprintKeys[hash]];
    }, 

    /**
     * Converts a building shape blueprint into a 3D building layout
     * @param {Array<string>} blueprint - Array of strings where each digit represents building height
     * @returns {Array} 3D building layout compatible with FiveByFive building system
     */
    createBuildingFromBlueprint(blueprint) {
        if (!blueprint || blueprint.length === 0) {
            return [];
        }

        const height = blueprint.length;
        const width = blueprint[0].length;
        const maxStories = this.getMaxStories(blueprint);
        
        const layout = [];

        // Build floor by floor from ground up
        for (let floor = 0; floor < maxStories; floor++) {
            const floorLayout = [];
            
            // Build row by row (Y dimension)
            for (let y = 0; y < height; y++) {
                const row = [];
                
                // Build column by column (X dimension) 
                for (let x = 0; x < width; x++) {
                    const storiesAtCell = parseInt(blueprint[y][x]);
                    
                    // If this floor exists at this position
                    if (floor < storiesAtCell) {
                        const cellCode = this.getCellCode(x, y, width, height, floor, storiesAtCell, blueprint);
                        row.push(cellCode);
                    } else {
                        // No building at this height
                        row.push('    '); // Empty space
                    }
                }
                floorLayout.push(row);
            }
            layout.push(floorLayout);
        }

        return layout;
    },

    /**
     * Gets the maximum number of stories in the blueprint
     */
    getMaxStories(blueprint) {
        let max = 0;
        for (let y = 0; y < blueprint.length; y++) {
            for (let x = 0; x < blueprint[y].length; x++) {
                const stories = parseInt(blueprint[y][x]);
                if (stories > max) {
                    max = stories;
                }
            }
        }
        return max;
    },

    /**
     * Determines the appropriate cell code for a given position
     * Cell codes use SENW format (South, East, North, West)
     * 'w' = wall with window, '+' = no wall, ' ' = empty space, 'd' = door
     */
    getCellCode(x, y, width, height, floor, storiesAtCell, blueprint) {
        let code = '';
        
        // South wall (negative Y direction)
        code += this.getWallType(x, y, blueprint, 0, -1, floor);
        
        // East wall (positive X direction) 
        code += this.getWallType(x, y, blueprint, -1, 0, floor);
        
        // North wall (positive Y direction)
        code += this.getWallType(x, y, blueprint, 0, 1, floor);
        
        // West wall (negative X direction)
        code += this.getWallType(x, y, blueprint, 1, 0, floor);

        return code;
    },

    /**
     * Determines wall type for a specific direction
     */
    getWallType(x, y, blueprint, dx, dy, floor) {
        const neighborX = x + dx;
        const neighborY = y + dy;
        const height = blueprint.length;
        const width = blueprint[0].length;
        
        // If neighbor is outside blueprint bounds, we need a wall
        if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) {
            // Ground floor gets door at entrance (find first valid cell)
            if (floor === 0 && x === 0 && y === 0 && dx === 0 && dy === -1) {
                return 'd'; // Door on south wall of first corner
            }
            return 'w'; // Default wall with window
        }
        
        // Check if neighbor has building at this floor level
        const neighborStories = parseInt(blueprint[neighborY][neighborX]);
        const currentStories = parseInt(blueprint[y][x]);
        
        // If neighbor has no building or building doesn't reach this floor
        if (neighborStories === 0 || neighborStories <= floor) {
            // Ground floor gets door at entrance
            if (floor === 0 && x === 0 && y === 0 && dx === 0 && dy === -1) {
                return 'd';
            }
            return 'w'; // Need wall - neighbor is empty or shorter
        }
        
        // Both cells have building at this floor level - no wall needed
        return '+';
    }
};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Blueprint = Blueprint;
} else {
    module.exports = Blueprint;
}