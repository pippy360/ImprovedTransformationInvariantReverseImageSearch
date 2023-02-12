// ######  #     #    #     #####  #     #
// #     # #     #   # #   #     # #     #
// #     # #     #  #   #  #       #     #
// ######  ####### #     #  #####  #######
// #       #     # #######       # #     #
// #       #     # #     # #     # #     #
// #       #     # #     #  #####  #     #
//phash

// Credit goes to:
// https://raw.githubusercontent.com/naptha/phash.js/master/phash.js

// https://ironchef-team21.googlecode.com/git-history/75856e07bb89645d0e56820d6e79f8219a06bfb7/ironchef_team21/src/ImagePHash.java

function pHash(img) {
    var size = 32,
        smallerSize = 8;

    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');

    //document.body.appendChild(canvas)

    /* 1. Reduce size.
     * Like Average Hash, pHash starts with a small image.
     * However, the image is larger than 8x8; 32x32 is a good size.
     * This is really done to simplify the DCT computation and not
     * because it is needed to reduce the high frequencies.
     */

    canvas.width = size;
    canvas.height = size;
    // ctx.drawImage(img, 0, 0, size, size);
    ctx.drawImage(img, 0, -size, size, size * 3);
    var im = ctx.getImageData(0, 0, size, size);

    /* 2. Reduce color.
     * The image is reduced to a grayscale just to further simplify
     * the number of computations.
     */

    var vals = new Float64Array(size * size);
    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            var base = 4 * (size * i + j);
            vals[size * i + j] = 0.299 * im.data[base] +
                0.587 * im.data[base + 1] +
                0.114 * im.data[base + 2];
        }
    }

    /* 3. Compute the DCT.
     * The DCT separates the image into a collection of frequencies
     * and scalars. While JPEG uses an 8x8 DCT, this algorithm uses
     * a 32x32 DCT.
     */

    function applyDCT2(N, f) {
        // initialize coefficients
        var c = new Float64Array(N);
        for (var i = 1; i < N; i++) c[i] = 1;
        c[0] = 1 / Math.sqrt(2);

        // output goes here
        var F = new Float64Array(N * N);

        // construct a lookup table, because it's O(n^4)
        var entries = (2 * N) * (N - 1);
        var COS = new Float64Array(entries);
        for (var i = 0; i < entries; i++)
            COS[i] = Math.cos(i / (2 * N) * Math.PI);

        // the core loop inside a loop inside a loop...
        for (var u = 0; u < N; u++) {
            for (var v = 0; v < N; v++) {
                var sum = 0;
                for (var i = 0; i < N; i++) {
                    for (var j = 0; j < N; j++) {
                        sum += COS[(2 * i + 1) * u]
                            * COS[(2 * j + 1) * v]
                            * f[N * i + j];
                    }
                }
                sum *= ((c[u] * c[v]) / 4);
                F[N * u + v] = sum;
            }
        }
        return F
    }

    var dctVals = applyDCT2(size, vals);

    // for(var x = 0; x < size; x++){
    // 	for(var y = 0; y < size; y++){
    // 		ctx.fillStyle = (dctVals[size * x + y] > 0) ? 'white' : 'black';
    // 		ctx.fillRect(x, y, 1, 1)
    // 	}
    // }
    /* 4. Reduce the DCT.
     * This is the magic step. While the DCT is 32x32, just keep the
     * top-left 8x8. Those represent the lowest frequencies in the
     * picture.
     */

    var vals = [];
    for (var x = 1; x <= smallerSize; x++) {
        for (var y = 1; y <= smallerSize; y++) {
            vals.push(dctVals[size * x + y])
        }
    }

    /* 5. Compute the average value.
     * Like the Average Hash, compute the mean DCT value (using only
     * the 8x8 DCT low-frequency values and excluding the first term
     * since the DC coefficient can be significantly different from
     * the other values and will throw off the average).
     */

    var median = vals.slice(0).sort(function (a, b) {
        return a - b
    })[Math.floor(vals.length / 2)];

    /* 6. Further reduce the DCT.
     * This is the magic step. Set the 64 hash bits to 0 or 1
     * depending on whether each of the 64 DCT values is above or
     * below the average value. The result doesn't tell us the
     * actual low frequencies; it just tells us the very-rough
     * relative scale of the frequencies to the mean. The result
     * will not vary as long as the overall structure of the image
     * remains the same; this can survive gamma and color histogram
     * adjustments without a problem.
     */

    return vals.map(function (e) {
        return e > median ? '1' : '0';
    }).join('');
}

//TODO: rename
function distance(a, b) {
    var dist = 0;
    for (var i = 0; i < a.length; i++)
        if (a[i] != b[i]) dist++;
    return dist;
}

// converts binary string to a hexadecimal string
// returns an object with key 'valid' to a boolean value, indicating
// if the string is a valid binary string.
// If 'valid' is true, the converted hex string can be obtained by
// the 'result' key of the returned object
function binaryToHex(s) {
    var i, k, part, accum, ret = '';
    for (i = s.length-1; i >= 3; i -= 4) {
        // extract out in substrings of 4 and convert to hex
        part = s.substr(i+1-4, 4);
        accum = 0;
        for (k = 0; k < 4; k += 1) {
            if (part[k] !== '0' && part[k] !== '1') {
                // invalid character
                return { valid: false };
            }
            // compute the length 4 substring
            accum = accum * 2 + parseInt(part[k], 10);
        }
        if (accum >= 10) {
            // 'A' to 'F'
            ret = String.fromCharCode(accum - 10 + 'A'.charCodeAt(0)) + ret;
        } else {
            // '0' to '9'
            ret = String(accum) + ret;
        }
    }
    // remaining characters, i = 0, 1, or 2
    if (i >= 0) {
        accum = 0;
        // convert from front
        for (k = 0; k <= i; k += 1) {
            if (s[k] !== '0' && s[k] !== '1') {
                return { valid: false };
            }
            accum = accum * 2 + parseInt(s[k], 10);
        }
        // 3 bits, value cannot exceed 2^3 - 1 = 7, just convert
        ret = String(accum) + ret;
    }
    return { valid: true, result: ret };
}

// converts hexadecimal string to a binary string
// returns an object with key 'valid' to a boolean value, indicating
// if the string is a valid hexadecimal string.
// If 'valid' is true, the converted binary string can be obtained by
// the 'result' key of the returned object
function hexToBinary(s) {
    var i, k, part, ret = '';
    // lookup table for easier conversion. '0' characters are padded for '1' to '7'
    var lookupTable = {
        '0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
        '5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
        'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
        'e': '1110', 'f': '1111',
        'A': '1010', 'B': '1011', 'C': '1100', 'D': '1101',
        'E': '1110', 'F': '1111'
    };
    for (i = 0; i < s.length; i += 1) {
        if (lookupTable.hasOwnProperty(s[i])) {
            ret += lookupTable[s[i]];
        } else {
            return { valid: false };
        }
    }
    return { valid: true, result: ret };
}