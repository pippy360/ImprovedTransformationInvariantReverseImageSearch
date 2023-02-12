// #     #
// ##   ##   ##   ##### #    #
// # # # #  #  #    #   #    #
// #  #  # #    #   #   ######
// #     # ######   #   #    #
// #     # #    #   #   #    #
// #     # #    #   #   #    #
//math

//a = [1,0,0], b = [[1],[0],[0]]
//[1,0,0]*[[1],[0],[0]] = [1]
function matrixMultiply(a, b) {
    var aNumRows = a.length, aNumCols = a[0].length,
        bNumRows = b.length, bNumCols = b[0].length,
        m = new Array(aNumRows);  // initialize array of rows
    for (var r = 0; r < aNumRows; ++r) {
        m[r] = new Array(bNumCols); // initialize the current row
        for (var c = 0; c < bNumCols; ++c) {
            m[r][c] = 0;             // initialize the current cell
            for (var i = 0; i < aNumCols; ++i) {
                m[r][c] += a[r][i] * b[i][c];
            }
        }
    }
    return m;
}

function getCosFromDegrees(degrees) {
    return Math.cos(degrees * Math.PI/180);
}

function getSinFromDegrees(degrees) {
    return Math.sin(degrees * Math.PI/180);
}

function inner_bilinear_interp(q00, q10, q01, q11, x, y) {
    var un_x = 1.0 - x; var un_y = 1.0 - y;
    return (q00 * un_x * un_y + q10 * x * un_y + q01 * un_x * y + q11 * x * y);
}

function bilinearInterp(image, xVal, yVal) {
    var x1 = Math.floor(xVal);
    var x2 = Math.floor(xVal) + 1;
    var y1 = Math.floor(yVal);
    var y2 = Math.floor(yVal) + 1;
    if (y2 >= imgh) {
        y2 = imgh - 1;
    }
    if (x2 >= imgw) {
        x2 = imgw - 1;
    }
    return inner_bilinear_interp(image[y1][x1], image[y2][x1], image[y1][x2], image[y2][x2], xVal - x1, yVal - y1)
}


function getScaleMatrix(scaleX, scaleY) {
    return [[scaleX, 0, 0], [0, scaleY, 0], [0, 0, 1]];
}

function getNormScaleMatrix(scale) {
    var normX = Math.sqrt(scale);
    var normY = 1.0 / (Math.sqrt(scale));
    return [[normX, 0, 0], [0, normY, 0], [0, 0, 1]];
}

function getRotationMatrix(inRotation) {
    var toRads = inRotation * Math.PI / 180.0;
    return [
        [Math.cos(toRads), -Math.sin(toRads), 0],
        [Math.sin(toRads), Math.cos(toRads), 0],
        [0, 0, 1]
    ];
}

function getSkewMatrix(x, y) {
    console.log("x: " +x *(Math.PI/180.0) + " y: " + y);
    const x_t = Math.tan(x*(Math.PI/180.0));
    const y_t = Math.tan(y*(Math.PI/180.0));
    return [
        [1, x_t, 0],
        [y_t, 1, 0],
        [0, 0, 1]
    ];
}

function getTranslateMatrix(x, y) {
    return [
        [1, 0, x],
        [0, 1, y],
        [0, 0, 1]
    ];
}

function getIdentityMatrix() {
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];
}

function getTranslateMatrix_point(point, direction) {
    direction = (direction == undefined)? 1 : direction;
    return [
        [1, 0, point[0]*direction],
        [0, 1, point[1]*direction],
        [0, 0, 1]
    ];
}

function getAngleForOnePoint_matrix(point) {

    if(point[0] === 0 && point[1] >= 0) {
        return 270;
    } else if(point[0] === 0 && point[1] < 0) {
        return 90;
    }

    const atanVal = Math.atan(point[1]/point[0]);
    let degs = Math.abs(atanVal * 180.0/Math.PI);

    if (point[1] >= 0 && point[0] >= 0) {
        degs = 360 - degs;
    } else if (point[1] >= 0 && point[0] < 0) {
        degs += 180;
    } else if (point[1] < 0 && point[0] < 0) {
        degs = 180 - degs;
    }

    return degs
}

function getAngleBetweenTwoPoints_matrix(point1, point2) {
    return Math.abs(getAngleForOnePoint_matrix(point1) - getAngleForOnePoint_matrix(point2))
}

function addTwoPoints(point1, point2) {
    return [
        point1[0] + point2[0],
        point1[1] + point2[1]
    ]
}

function minusTwoPoints(point1, point2) {
    return [
        point1[0] - point2[0],
        point1[1] - point2[1]
    ]
}

function applyTransformationMatrixToPoint_m(point, mat) {
    var resPoint = matrixMultiply( mat, [[point[0]], [point[1]], [1]]);
    return [ resPoint[0][0], resPoint[1][0] ]
}

function applyTransformationMatrixToAllKeypoints(keypoints, transformationMat) {
    var ret = [];
    for (var i = 0; i < keypoints.length; i++) {
        var transformedKeypoint = applyTransformationMatrixToPoint_m(keypoints[i], transformationMat);
        ret.push(transformedKeypoint);
    }
    return ret;
}


