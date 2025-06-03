//const { BLOCK_TYPES } = require("./World");

const Houses = {
    wallHeight: 5,

    isBuildable(x, y) {
        const x1 = x - 5;
        const x2 = x + 5;
        const y1 = y - 5;
        const y2 = y + 5;

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const lowest = Math.min(h11,h12,h21,h22);
        const highest = Math.max(h11,h12,h21,h22);
        const diff = highest - lowest;
        return diff < 7 && lowest >= 0;
    },

    createHouse(centerX, centerY, size = 10) {
        const blocks = [];

        const x1 = centerX - Math.floor(size / 2);
        const x2 = centerX + Math.floor(size / 2);
        const y1 = centerY - Math.floor(size / 2);
        const y2 = centerY + Math.floor(size / 2);

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const foundationZ = Math.max(h11,h12,h21,h22);

        //Create pillars to support elevated floor
        blocks.push(...this.createPillar(x1, y1, h11, foundationZ));
        blocks.push(...this.createPillar(x1, y2, h12, foundationZ));
        blocks.push(...this.createPillar(x2, y1, h21, foundationZ));
        blocks.push(...this.createPillar(x2, y2, h22, foundationZ));

        //create floor
        blocks.push(...this.createFloor(x1, y1, x2, y2, foundationZ));
        
        //create walls  
        blocks.push(...this.createXWall(x1, x2, y1, foundationZ));
        blocks.push(...this.createXWall(x1, x2, y2, foundationZ));
        blocks.push(...this.createYWall(y1, y2, x1, foundationZ));
        blocks.push(...this.createYWall(y1, y2, x2, foundationZ));
        
        //create roof
        blocks.push(...this.createRoof(x1, y1, x2, y2, foundationZ + this.wallHeight));

        return {
            type: STRUCTURE_TYPES.HOUSE,
            blocks: blocks,
            metadata: {
                //height: height,
                groundHeight: foundationZ
            }
        };
    },

    createPillar(x, y, bottom, top, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        for(let z = bottom; z <= top; z++) { blocks.push({ x, y, z, type }); }
        return blocks;
    },

    createFloor(x1, y1, x2, y2, z, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                blocks.push({ x, y, z, type });
            }
        }
        return blocks;
    },

    createXWall(x1, x2, y, foundationZ, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        const gapLocation = Math.floor((x1 + x2) / 2);
        const gapBottom = Math.floor(foundationZ + (5 * 2/10));
        const gapTop = Math.ceil(foundationZ + (5 * 7/10));

        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let z = foundationZ; z <= foundationZ + this.wallHeight; z++) {
                const isCorner = (x === x1 || x == x2);
                const isGap = (z > gapBottom &&  z < gapTop && (x === gapLocation || x === gapLocation + 1));
                if(!isGap) {
                    blocks.push({ x, y, z, type });
                }
            }
        }
        return blocks;
    },

    createYWall(y1, y2, x, foundationZ, type = BLOCK_TYPES.STONE) {
        const blocks = [];
        const gapLocation = Math.floor((y1 + y2) / 2);
        const gapBottom = foundationZ;
        const gapTop = foundationZ + 4;

        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for (let z = foundationZ; z <= foundationZ + this.wallHeight; z++) {
                const isGap = (y === gapLocation || y === gapLocation + 1) && z > gapBottom && z < gapTop;
                const isCorner = (y === y1 || y === y2);
                if(!isGap) {
                    blocks.push({ x, y, z, type });
                }
            }
        }
        return blocks;
    },

    createRoof(x1, y1, x2, y2, z, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
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