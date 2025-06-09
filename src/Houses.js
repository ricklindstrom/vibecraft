//const { BLOCK_TYPES } = require("./World");

const Houses = {

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

    createHouse(centerX, centerY, size = 10, wallHeight = 5) {
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
        const porch = 4;

        //Create pillars to support elevated floor
        blocks.push(...Structures.createPillar(x1, y1, h11, foundationZ));
        blocks.push(...Structures.createPillar(x1, y2, h12, foundationZ));
        blocks.push(...Structures.createPillar(x2, y1, h21, foundationZ));
        blocks.push(...Structures.createPillar(x2, y2, h22, foundationZ));

        //create floor
        blocks.push(...Structures.createFloor(x1, y1 - porch, x2, y2, foundationZ));
        
        //create walls  
        blocks.push(...Structures.createXWall(x1, x2, y1, foundationZ, false, true)); //Door Here
        blocks.push(...Structures.createXWall(x1, x2, y2, foundationZ));
        blocks.push(...Structures.createYWall(y1, y2, x1, foundationZ));
        blocks.push(...Structures.createYWall(y1, y2, x2, foundationZ));
        
        //create roof
        blocks.push(...Structures.createPyramidRoof(x1, y1, x2, y2, foundationZ + wallHeight));

        return {
            type: STRUCTURE_TYPES.HOUSE,
            blocks: blocks,
            metadata: {
                //height: height,
                groundHeight: foundationZ
            }
        };
    }


};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Houses = Houses;
} else {
    module.exports = Houses;
} 