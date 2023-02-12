
function findCentroid(pts){
    var off = pts[0];
    var twicearea = 0;
    var x = 0;
    var y = 0;
    var p1, p2;
    var f;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        p1 = pts[i];
        p2 = pts[j];
        f = (p1[0] - off[0]) * (p2[1] - off[1]) - (p2[0] - off[0]) * (p1[1] - off[1]);
        twicearea += f;
        x += (p1[0] + p2[0] - 2 * off[0]) * f;
        y += (p1[1] + p2[1] - 2 * off[1]) * f;
    }

    f = twicearea * 3;

    return [x / f + off[0], y / f + off[1]];
}

function isPointInPolygon(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

function calcPolygonArea(vertices) {
    var total = 0;

    for (var i = 0, l = vertices.length; i < l; i++) {
        var addX = vertices[i][0];
        var addY = vertices[i == vertices.length - 1 ? 0 : i + 1][1];
        var subX = vertices[i == vertices.length - 1 ? 0 : i + 1][0];
        var subY = vertices[i][1];

        total += (addX * addY * 0.5);
        total -= (subX * subY * 0.5);
    }

    return Math.abs(total);
}

function getSlopeOfLine(y2, y1, x2, x1) {
    return (y2-y1)/(x2-x1);
}

function getConstantofLineWithSlope(y2, y1, x2, x1) {
    return y2 - (getSlopeOfLine(y2, y1, x2, x1) * x2);
}

//returns x value when y == 0 for equation y=mx+c
function getXValueWhenYZero(y2, y1, x2, x1) {
    if (x2 - x1 == 0)
        return x2;

    var c = getConstantofLineWithSlope(y2, y1, x2, x1);
    var m = getSlopeOfLine(y2, y1, x2, x1);
    return -c/m;
}

//returns y value when x == 0 for equation y=mx+c
function getYValueWhenXZero(y2, y1, x2, x1) {
    return getConstantofLineWithSlope(y2, y1, x2, x1);
}

function splitShapeVert_m(inPoints, cPoint) {
    var outputRight = [];
    var outputLeft = [];

    inPoints = applyTransformationMatrixToAllKeypoints(inPoints, getTranslateMatrix(-cPoint[0], -cPoint[1]));

    let prevPoint = inPoints[inPoints.length - 1];

    for (let i = 0; i < inPoints.length; i++) {
        let point = inPoints[i];

        //check if we crossed a boundary
        if ( (point[0] >= 0 && prevPoint[0] < 0) || (point[0] < 0 && prevPoint[0] >= 0) ) {
            let yval = getYValueWhenXZero(point[1], prevPoint[1], point[0], prevPoint[0]);
            outputRight.push([0, yval]);
            outputLeft.push([0, yval]);
        }

        //if it's a boundary point don't add it twice
        if (point[0] != 0) {
            if (point[0] >= 0) {
                outputRight.push(point)
            } else {
                outputLeft.push(point)
            }
        }
        prevPoint = point;
    }
    outputRight = applyTransformationMatrixToAllKeypoints(outputRight, getTranslateMatrix(cPoint[0], cPoint[1]));
    outputLeft = applyTransformationMatrixToAllKeypoints(outputLeft, getTranslateMatrix(cPoint[0], cPoint[1]));
    return [outputRight, outputLeft];
}

function splitShapeHorz_m(inPoints, cPoint) {
    let outputTop = [];
    let outputBottom = [];

    inPoints = applyTransformationMatrixToAllKeypoints(inPoints, getTranslateMatrix(-cPoint[0], -cPoint[1]));

    let prevPoint = inPoints[inPoints.length - 1];

    for (let i = 0; i < inPoints.length; i++) {
        let point = inPoints[i];

        //check if we crossed a boundary
        if ( (point[1] >= 0 && prevPoint[1] < 0) || (point[1] < 0 && prevPoint[1] >= 0) ) {
            let xval = getXValueWhenYZero(point[1], prevPoint[1], point[0], prevPoint[0]);
            outputTop.push([xval, 0]);
            outputBottom.push([xval, 0]);
        }

        //if it's a boundary point don't add it twice
        if (point[1] != 0) {
            if (point[1] >= 0) {
                outputTop.push(point)
            } else {
                outputBottom.push(point)
            }
        }
        prevPoint = point;
    }
    outputTop = applyTransformationMatrixToAllKeypoints(outputTop, getTranslateMatrix(cPoint[0], cPoint[1]));
    outputBottom = applyTransformationMatrixToAllKeypoints(outputBottom, getTranslateMatrix(cPoint[0], cPoint[1]));
    return [outputTop, outputBottom];
}