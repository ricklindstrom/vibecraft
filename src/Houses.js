//const { BLOCK_TYPES } = require("./World");

const Houses = {

    createHouse(centerX, centerY) {
        const blocks = [];
        const height = 10;

        const x1 = centerX - 5;
        const x2 = centerX + 5;
        const y1 = centerY - 5;
        const y2 = centerY + 5;

        const groundHeight = 
            (TerrainGenerator.getTerrainHeight(x1, y1) +
             TerrainGenerator.getTerrainHeight(x2, y2) +
             TerrainGenerator.getTerrainHeight(x1, y2) +
             TerrainGenerator.getTerrainHeight(x2, y1)) / 4;

        //create floor
        blocks.push(...this.createFloor(x1, y1, x2, y2, groundHeight));
        //create walls  
        blocks.push(...this.createXWall(x1, x2, y1, groundHeight));
        blocks.push(...this.createXWall(x1, x2, y2, groundHeight));
        blocks.push(...this.createYWall(y1, y2, x1, groundHeight));
        blocks.push(...this.createYWall(y1, y2, x2, groundHeight));

        return {
            type: STRUCTURE_TYPES.HOUSE,
            blocks: blocks,
            metadata: {
                height: height,
                groundHeight: groundHeight
            }
        };
    },

    //Wrong but will fix later
    createFloor(x1, y1, x2, y2, groundHeight, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                blocks.push({ x, y, groundHeight, type });
            }
        }
        return blocks;
    },

    createXWall(x1, x2, y, height, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let z = height; z <= height + 10; z++) {
                blocks.push({ x, y, z, type });
            }
        }
        return blocks;
    },

    createYWall(y1, y2, x, height, type = BLOCK_TYPES.STONE) {
        const blocks = [];
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for (let z = height; z <= height + 10; z++) {
                blocks.push({ x, y, z, type });
            }
        }
        return blocks;
    }


};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Houses = Houses;
} else {
    module.exports = Houses;
} 