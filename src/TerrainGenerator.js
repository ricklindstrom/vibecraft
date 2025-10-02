// Utility function for coordinate keys
const coordKey = (x, y) => `${x},${y}`;

// Caches
const continentalnessCache = new Map();
const terrainHeightCache = new Map();

// TerrainGenerator implementation
const TerrainGenerator = {
    amplitude: 1.0, // Controls overall terrain height

    simpleNoise(x, z, scale = 0.1, amplitude = 3) {
        const n1 = Math.sin(x * scale) * Math.cos(z * scale);
        const n2 = Math.sin(x * scale * 2.3 + 1.7) * Math.cos(z * scale * 1.8 + 2.1);
        const n3 = Math.sin(x * scale * 0.7 + 3.2) * Math.cos(z * scale * 0.9 + 1.3);
        return (n1 + n2 * 0.5 + n3 * 0.25) * amplitude;
    },


    // If the slope is greater than 1, then it is a cliff
    isCliff(x, y) {
        const current = this.getTerrainHeight(x, y);
        if(current > this.getTerrainHeight(x + 1, y) + 1) return true;
        if(current > this.getTerrainHeight(x - 1, y) + 1) return true;
        if(current > this.getTerrainHeight(x, y + 1) + 1) return true;
        if(current > this.getTerrainHeight(x, y - 1) + 1) return true;
        return false;
     },

    // Linear interpolation
    lerp(a, b, t) { return a + (b - a) * t; },

    //Returns a lerp of the spline for the continentalness + or - a delta
    splineMap(continentalness) {
        const delta = 0.4;
        const spline = this.splineMapReal(continentalness);
        const splineR1 = this.splineMapReal(continentalness + delta);
        const splineR2 = this.splineMapReal(continentalness + delta * 2);
        const splineL1 = this.splineMapReal(continentalness - delta);
        const splineL2 = this.splineMapReal(continentalness - delta * 2);
        return (spline + splineR1 + splineR2 + splineL1 + splineL2) / 5;
    },

    splineMapReal(continentalness) {
        if (continentalness < -0.7) return -12;
        //if (continentalness < -0.5) return -8;
        if (continentalness < -0.3) return -4;
        if (continentalness < -0.1) return -1;
        if (continentalness < 0.2) return 2;
        if (continentalness < 0.4) return 12;
        //if (continentalness < 0.6) return 12;
        if (continentalness < 0.8) return 35;
        return 50;
    },

    continentalnessNoise(x, y) {
        //return 0; // TEMP DEBUG
        const value = this.simpleNoise(x, y, 0.005, 1);
        return value;
    },

    getTerrainHeight(x, y) {
        return Math.floor(this.getTerrainDetail(x,y));
    },

    getTerrainDetail(x, y) {
        //const cont = this.continentalnessNoise(x, y);
        //let baseHeight = this.splineMap(cont) * 20;
        let baseHeight = 20 * this.amplitude;
        let detail = 0;
        
        // Generate terrain detail with proper octave scaling
        const numOctaves = 5;
        const baseFrequency = 0.01;
        const baseAmplitude = 16 * this.amplitude;
        
        for (let i = 0; i < numOctaves; i++) {
            const frequency = baseFrequency * Math.pow(2, i);
            const amplitude = baseAmplitude * Math.pow(0.5, i);
            detail += this.simpleNoise(x, y, frequency, amplitude);
        }
        
        // Create flatness mask - low values = flatter terrain
        const flatnessNoise = this.simpleNoise(x, y, 0.03, 1); // Low frequency for large flat areas
        const flatnessFactor = Math.max(0.1, (flatnessNoise + 1) / 2); // 0.1 to 1.0
        
        // Apply flatness mask to detail - areas with low flatnessFactor become very flat
        detail *= flatnessFactor;
        
        return baseHeight + detail;
    }
};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.TerrainGenerator = TerrainGenerator;
} else {
    module.exports = TerrainGenerator;
} 