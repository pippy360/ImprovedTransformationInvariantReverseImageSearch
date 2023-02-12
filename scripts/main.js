

/*

  #####
 #     # #       ####  #####    ##   #       ####
 #       #      #    # #    #  #  #  #      #
 #  #### #      #    # #####  #    # #       ####
 #     # #      #    # #    # ###### #           #
 #     # #      #    # #    # #    # #      #    #
  #####  ######  ####  #####  #    # ######  ####

*/
const CIRCLE_RADIUS_MULT = 2;
const DELTA_TOTAL = 10;
const POINT_JUMP_VALUE = 1;
const DIRECTION_POINT_COUNT = 400;
const ROTATION_JUMP = .5;
const SKIP_BLUR = true;
const BLUR_RADIUS = 3;
const COLOUR_SPLITS = 256;
const FRAGMENT_CROP_RADIUS_MULT = 2;
const PIXEL_CHANGE_CHECK_LENGTH = 1;
const FIXED_SHAPE_SCALE = 50;
let g_shape_index = 0;
let g_shape = shape1_shape;

var g_globalState = {
    canvasClickLocation: {x: .5, y: .5},
    inputImage1Mat: null,
    inputImage2Mat: null,
};

let imgw = 400;
let imgh = 400;
let g_src = "";
let g_img = new Image();
g_img.src = g_src;

function rotatePoint_matrix(degrees, point) {
    rads = degrees  * Math.PI / 180.0; //convert to rads
    sinT = Math.sin(rads);
    cosT = Math.cos(rads);

    rotMat = [[cosT,sinT],[-sinT,cosT]];
    pointMat = [[point[0]], [point[1]]];

    return matrixMultiply(rotMat, pointMat);
}

function applyTransformToPoint_matrix(degrees, normX, point) {
    var ret = point;
    ret = rotatePoint_matrix(degrees, ret);

    ret = [ ret[0]*normX, ret[1] ];

    ret = rotatePoint_matrix(-degrees, ret);
    return ret
}

function applyTransformToAllPoints(tetha, normX, normY, points) {
    var ret = [];

    for (var i = 0; i < points.length; i++){

        newPoint = points[i];
        newPoint = applyTransformToPoint_matrix(tetha, normX, [newPoint[0], newPoint[1]]);
        newPoint = applyTransformToPoint_matrix(tetha+90, normY, [newPoint[0], newPoint[1]]);

        ret.push( [ newPoint[0][0], newPoint[1][0] ] )
    }
    return ret
}

function getPixels(image, width, height, rot, scale, scaleRot) {
    var canvas = document.getElementById('imageMods');
    var ctx = canvas.getContext('2d');
    ctx.save();

    ctx.translate(imgw/2, imgh/2);
    ctx.rotate(scaleRot * Math.PI / 180);

    var normX = Math.sqrt(scale);
    var normY = 1.0 / (Math.sqrt(scale));
    ctx.scale(normX, normY);

    ctx.rotate(-scaleRot * Math.PI / 180);
    ctx.translate(-imgw/2, -imgh/2);

    ctx.translate(imgw/2, imgh/2);
    ctx.rotate(rot * Math.PI / 180);
    ctx.translate(-imgw/2, -imgh/2);
    ctx.drawImage(image, 0, 0, imgw, imgh);
    ctx.restore();
    return ctx.getImageData(0, 0, width, height).data;
}

function toBlackAndWhite(imageData) {
    var output = []

    for (i = 0; i < imgh; i++) {
        var arr = []
        for (j = 0; j < imgw; j++) {
            var index = ( i * (imgw * 4) ) + (j * 4)
            var val = ((imageData[index] + imageData[index+1] + imageData[index+2])/3.0)
            arr.push(val)
        }
        output.push(arr)
    }
    return output
}

function getAverageValueOf5(zvals, i, length) {
    var distvals = [];
    for (var k = 0; k < length; k++) {
            distvals.push(zvals[i+k].z);
    }
    const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
    return average(distvals);
}

function findRightPointOfAnchor(output) {
    for (let i = 0; i < output.length - (PIXEL_CHANGE_CHECK_LENGTH*2); i++) {
        if( Math.abs( getAverageValueOf5(output, i, PIXEL_CHANGE_CHECK_LENGTH) - getAverageValueOf5(output, i+PIXEL_CHANGE_CHECK_LENGTH, PIXEL_CHANGE_CHECK_LENGTH) )  > DELTA_TOTAL) {
            return i;
        }
    }
}

function getDirectionPointsWithjump(xval, yval, xjump, yjump) {
    var dx = xval;
    var dy = yval;
    var output = [];
    var count = 0;
    while(dx < imgw && dx > 0 && dy < imgh && dy > 0) {
        if (count > DIRECTION_POINT_COUNT) {
            break;
        }
        output.push({x: dx, y: dy});
        count++;
        dx = dx + xjump;
        dy = dy + yjump;
    }
    return output;
}

function to_matrix_shape(shape) {
    var ret = [];
    for (let i = 0; i < shape.length; i++) {
        ret.push([shape[i].x, shape[i].y]);
    }
    return ret;
}

function getDirectionPoints(xval, yval, rot) {
    var jumpH = POINT_JUMP_VALUE;
    var cosval = getCosFromDegrees(rot);
    var sinval = getSinFromDegrees(rot);
    return getDirectionPointsWithjump(
        xval + cosval, yval + sinval, cosval*jumpH, sinval*jumpH)
}

function getZValues(image, xval, yval, rot) {
    var points = getDirectionPoints(xval, yval, rot);
    var ret = [];
    for (var i = 0; i < points.length; i++) {
        ret.push( {
            x: points[i].x,
            y: points[i].y,
            z: bilinearInterp(image, points[i].x, points[i].y)
        } );
    }
    return ret;
}

function canvasTransform(ctx, mat) {
    ctx.transform(mat[0][0], mat[1][0], mat[0][1], mat[1][1], mat[0][2], mat[1][2]);
}

function getHitPoints(img, imageData, clickedPoint) {
    const m_xval = clickedPoint[0];
    const m_yval = clickedPoint[1];
    var blackandwhite = toBlackAndWhite(imageData);
    var rot = 0;
    var shape = [];
    var queue = [];
    for (let rot = 0, i = 0; rot < 360; rot += ROTATION_JUMP) {

        var zvals = getZValues(blackandwhite, m_xval, m_yval, rot);
        var distvals = [];
        for (var k = 0; k < 1; k++) {
            var d__ = findRightPointOfAnchor(zvals, DELTA_TOTAL + (k*3));
            if (d__ != undefined)
                distvals.push(d__);
        }
        const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;

        var dist = parseInt(average(distvals));
        if (dist == undefined)
            continue;

        queue.push(dist)

        const currPoint = zvals[parseInt(average(queue))];
        shape.push([currPoint.x, currPoint.y]);

        if (queue.length > 1)//smooth it
            queue.shift();
    }
    return shape;
}

function applyTransformationMatrixToPoint(point, mat) {
    var resPoint = matrixMultiply( mat, [[point[0]], [point[1]], [1]]);
    return [ resPoint[0][0], resPoint[1][0] ];
}

function getTransformationMatrixFromScale(scale, rotation, imgw, imgh) {
    var mat = getTranslateMatrix(imgw/2, imgh/2);
    mat = matrixMultiply(mat, getRotationMatrix(rotation));
    mat = matrixMultiply(mat, getNormScaleMatrix(scale));
    mat = matrixMultiply(mat, getRotationMatrix(-rotation));
    mat = matrixMultiply(mat, getTranslateMatrix(-imgw/2, -imgh/2));
    return mat;
}

function getTransformedPoint(point, mat, invMat) {
    const t = applyTransformationMatrixToPoint(point, invMat);
    return applyTransformationMatrixToPoint(t, mat);
}

function getAreaDiff(X) {
    let angle = X[0] % 360;
    //transform the shape, calc the diff
    let shape = applyTransformationMatrixToAllKeypoints(g_shape, getRotationMatrix(angle));

    const cPoint = findCentroid(shape);
    const topHalfBottomHalf = splitShapeHorz_m(shape, cPoint);
    const topHalf = topHalfBottomHalf[0];
    const rightHalfLeftHalf = splitShapeVert_m(topHalf, cPoint);
    const topRight = rightHalfLeftHalf[0];
    const topLeft = rightHalfLeftHalf[1];
    return Math.abs(calcPolygonArea(topRight) - calcPolygonArea(topLeft));
}

function getLowestInRange(shape) {
    let cPoint = findCentroid(shape);
    shape = applyTransformationMatrixToAllKeypoints(shape, getTranslateMatrix(-cPoint[0], -cPoint[1]));
    g_shape = shape;

    //update the point to 0,0 we can remove this line
    cPoint = findCentroid(shape);

    const solution = nelderMead(getAreaDiff, [30]);
    shape = applyTransformationMatrixToAllKeypoints(shape, getRotationMatrix(solution.x[0]));
    const topHalfBottomHalf = splitShapeHorz_m(shape, cPoint);
    const topHalf = topHalfBottomHalf[0];
    const bottomHalf = topHalfBottomHalf[1];
    const rightLeftHalf = splitShapeVert_m(shape, cPoint);
    const right = rightLeftHalf[0];
    const left = rightLeftHalf[1];
    const rightC = findCentroid(right);
    const leftC = findCentroid(left);
    const topC = findCentroid(topHalf);
    const bottomC = findCentroid(bottomHalf);
    const leftAvg = (Math.abs(topC[1]) + Math.abs(bottomC[1]))
    const topAvg = (Math.abs(leftC[0]) + Math.abs(rightC[0]))
    const scaleAvg = (leftAvg/topAvg);
    console.log(scaleAvg);
    return [solution.x[0], scaleAvg, (leftAvg+topAvg)/2];
}

function getk1val(inshape) {
    return getk1val_shape(inshape);
    // let xs_sum = 0;
    // let ys_sum = 0;
    // let yss_sum = 0;
    // let xy_mult_sum = 0;
    // for (let i = 0; i < inshape.length; i++) {
    //     xs_sum += Math.pow( inshape[i][0], 2 );
    //     ys_sum += Math.pow( inshape[i][1], 2 );
    //     yss_sum += Math.pow( inshape[i][1], 4 );
    //     xy_mult_sum += inshape[i][0] * inshape[i][1];
    // }
    // let val = Math.pow(ys_sum, 2)/( (xs_sum*ys_sum) - Math.pow(xy_mult_sum, 2) );
    // return Math.sqrt( Math.sqrt( val ) );
}


function __showk1val(inshape) {
    let xs_sum = 0;
    let ys_sum = 0;
    let yss_sum = 0;
    let xy_mult_sum = 0;
    for (let i = 0; i < inshape.length; i++) {
        xs_sum += Math.pow( inshape[i][0], 2 );
        ys_sum += Math.pow( inshape[i][1], 2 );
        yss_sum += Math.pow( inshape[i][1], 4 );
        xy_mult_sum += inshape[i][0] * inshape[i][1];
    }
    return {
        xs_sum: xs_sum,
        ys_sum: ys_sum,
        xy_mult_sum: xy_mult_sum,
        ratioOfY_XY: xy_mult_sum/ys_sum,
    }
}

function getk2val(inshape) {
    return getk2val_shape(inshape);
    // var ys_sum = 0;
    // var xy_mult_sum = 0;
    // for (let i = 0; i < inshape.length; i++) {
    //     xs_sum += Math.pow( inshape[i][0], 2 );
    //     ys_sum += Math.pow( inshape[i][1], 2 );
    //     xy_mult_sum += inshape[i][0] * inshape[i][1];
    // }
    // return (-1 * getk1val(inshape) * xy_mult_sum) / ys_sum
}

function getShapeFixingTransformationMatrix(shape) {
    // shape = [[-1,-1], [1,-1], [1,1], [-1,1]];

    if (findCentroid(shape)[0] > 1 || findCentroid(shape)[1] > 1) {
        console.log("invalid shape");
        return null;
    }
    const k2 = getk2val(shape);
    const k1 = getk1val(shape);
    const withoutScaleFixMat =  [
        [k1,  k2, 0],
        [0, 1/k1, 0],
        [0,    0, 1],
    ];

    let fixedShape = applyTransformationMatrixToAllKeypoints(shape, withoutScaleFixMat);
    let globalRadius = getTheRadius(fixedShape, [0,0]);

    const withScaleFixMat = matrixMultiply(getScaleMatrix(60/globalRadius, 60/globalRadius), withoutScaleFixMat)
    return {
        scaleFixMat: withScaleFixMat,
        nonScaledFixedMat: withoutScaleFixMat,
        globalRadius: globalRadius,
    }
}

function get_a(inshape) {
    let xs_sum = 0;
    let ys_sum = 0;
    let yss_sum = 0;
    let xy_mult_sum = 0;
    for (let i = 0; i < inshape.length; i++) {
        xs_sum += Math.pow( inshape[i][0], 2 );
        ys_sum += Math.pow( inshape[i][1], 2 );
        yss_sum += Math.pow( inshape[i][1], 4 );
        xy_mult_sum += inshape[i][0] * inshape[i][1];
    }
    let val = Math.pow(ys_sum, 2)/( (xs_sum*ys_sum) - Math.pow(xy_mult_sum, 2) );
    return Math.sqrt( Math.sqrt( val ) );
}

function get_b(inshape) {
    let xs_sum = 0;
    let ys_sum = 0;
    let yss_sum = 0;
    let xy_mult_sum = 0;
    for (let i = 0; i < inshape.length; i++) {
        xs_sum += Math.pow( inshape[i][0], 2 );
        ys_sum += Math.pow( inshape[i][1], 2 );
        xy_mult_sum += inshape[i][0] * inshape[i][1];
    }
    return (-1 * get_a(inshape) * xy_mult_sum) / ys_sum
}

function applyFixToShape(imghitpoints, mat) {
    return applyTransformationMatrixToAllKeypoints(imghitpoints, mat);
}

function getmat(scaleRotation2, scale2) {
    var mat2 = getTranslateMatrix(-imgw / 2, -imgh / 2);
    mat2 = matrixMultiply(mat2, getRotationMatrix(scaleRotation2));
    mat2 = matrixMultiply(mat2, getScaleMatrix(Math.sqrt(scale2), 1.0 / Math.sqrt(scale2)));
    mat2 = matrixMultiply(mat2, getRotationMatrix(-scaleRotation2));
    mat2 = matrixMultiply(mat2, getTranslateMatrix(imgw / 2, imgh / 2));
    return mat2;
}

function getImgmat_c(scaleRotation2, scale2, rotPoint, newcpoint) {
    //Note: the order of transformations is backwards
    var mat2 = getIdentityMatrix();
    mat2 = matrixMultiply(mat2, getTranslateMatrix(200, 200));
    mat2 = matrixMultiply(mat2, getRotationMatrix(-scaleRotation2));
    mat2 = matrixMultiply(mat2, getScaleMatrix(Math.sqrt(scale2), 1.0 / Math.sqrt(scale2)));
    mat2 = matrixMultiply(mat2, getRotationMatrix(scaleRotation2));
    mat2 = matrixMultiply(mat2, getTranslateMatrix(-rotPoint[0], -rotPoint[1]));

    return mat2;
}

function getImgmat(scaleRotation2, scale2, rotPoint) {
    rotPoint = (rotPoint == undefined)? [0,0] : rotPoint;
    var mat2 = getIdentityMatrix();
    mat2 = matrixMultiply(mat2, getTranslateMatrix(rotPoint[0], rotPoint[1]));
    mat2 = matrixMultiply(mat2, getRotationMatrix(-scaleRotation2));
    mat2 = matrixMultiply(mat2, getScaleMatrix(Math.sqrt(scale2), 1.0 / Math.sqrt(scale2)));
    mat2 = matrixMultiply(mat2, getRotationMatrix(scaleRotation2));
    mat2 = matrixMultiply(mat2, getTranslateMatrix(-rotPoint[0], -rotPoint[1]));

    return mat2;
}

function getPixel(imgData, index) {
    var i = index*4, d = imgData.data;
    return [d[i],d[i+1],d[i+2],d[i+3]] // returns array [R,G,B,A]
}

// AND/OR



function drawPoints_m(ctx, points, colour, width) {
    for (let i = 0; i < points.length; i++) {
        drawPoint_m(ctx, points[i], colour, width)
    }
}

function drawCanvasMiddleLines(ctx) {
    let height = ctx.canvas.height;
    let width = ctx.canvas.width;
    drawline_m(ctx, [[width/2, 0], [width/2, height]]);
    drawline_m(ctx, [[0, height/2], [width, height/2]]);
    //FIXME: we need to transform the cirlces so that they're scewed
}

function getTheRadius(fixedHitPoints, cPoint) {
    const rightHalfLeftHalf = splitShapeVert_m(fixedHitPoints, cPoint);
    const topRightPoint = findCentroid(rightHalfLeftHalf[0]);
    return Math.abs(topRightPoint[0] - cPoint[0]) * CIRCLE_RADIUS_MULT;
}

function areaOfTwoPoints_wrapper(p1, p2) {
    let x1 = p1[0];
    let y1 = p1[1];
    let x2 = p2[0];
    let y2 = p2[1];
    if (Math.abs(x1 - x2) < 0.0000001) {
        return 0;
    }
    const m = getSlopeOfLine(y2, y1, x2, x1);
    const c = getConstantofLineWithSlope(y2, y1, x2, x1);
    return (m*Math.pow(x2,2)/2.0 + c * x2) - (m*Math.pow(x1,2)/2.0 + c * x1);
}

function getAverageValForPolygon(poly, area_func, val_func_x, val_func_y) {

    let add_area = 0;
    let remove_area = 0;
    let add_x = 0;
    let add_y = 0;
    let remove_x = 0;
    let remove_y = 0;
    for (let i = 0; i < poly.length; i++) {
        let p = poly[i];
        let np = i == poly.length-1? poly[0] : poly[i+1];

        //FIXME: shouldn't be the area of the actual points? like the number of input points?
        let area = areaOfTwoPoints_wrapper(p, np);

        if (area < 0.000000001 && area > -0.000000001)
            continue;

        if ( p[0] < np[0] ) {//check direction
            //
            add_area += Math.abs(area);
            let yvalavg = (val_func_y(p, np)/Math.abs(area));
            add_y += Math.abs(area) * (Math.abs(val_func_y(p, np))/Math.abs(area));
        } else {
            //
            remove_area += Math.abs(area);//maybe just don't Math.abs this
            let yvalavg = (val_func_y(p, np)/Math.abs(area));
            remove_y += Math.abs(area) * (Math.abs(val_func_y(p, np))/Math.abs(area));
        }
    }
    add_y = add_area == 0 ? 0 : add_y/add_area;
    remove_y = remove_area == 0 ? 0 : remove_y/remove_area;
    return {
        x_bar: (add_x),
        y_bar: ( ((add_area*add_y) - (remove_y*remove_area))/(add_area-remove_area) ),
        total_area: 1
    };
}

function getAverageYSquaredValForPoly(poly) {
    return getAverageValForPolygon(poly, null, null, get_y_squared_y_part_wrapper);
}

function getAverageXSquaredValForPoly(poly) {
    //these values will be negative
    poly = applyTransformationMatrixToAllKeypoints(poly, getRotationMatrix(90));
    return getAverageValForPolygon(poly, null, null, get_y_squared_y_part_wrapper);
}

function getAverageXYValForPoly(poly) {
    return getAverageValForPolygon(poly, null, null, get_xy_y_part_wrapper);
}

function getEquationPoints(shape) {

}


function getk1val_shape(shape) {
    let cPoint = [0, 0];
    // shape = applyTransformationMatrixToAllKeypoints(shape, getSkewMatrix(45, 0));
    // shape = applyTransformationMatrixToAllKeypoints(shape, getScaleMatrix(2, 1));
    // shape = applyTransformationMatrixToAllKeypoints(shape, getRotationMatrix(45));
    let topHalfBottomHalf = splitShapeHorz_m(shape, cPoint);
    let bottomHalf = topHalfBottomHalf[0];
    let topHalf = topHalfBottomHalf[1];
    let rightHalfLeftHalf = splitShapeVert_m(topHalf, cPoint);
    let bottomRight = rightHalfLeftHalf[0];
    let bottomLeft = rightHalfLeftHalf[1];
    let rightHalfLeftHalf2 = splitShapeVert_m(bottomHalf, cPoint);
    let topRight = rightHalfLeftHalf2[0];
    let topLeft = rightHalfLeftHalf2[1];

    let topRightArea = calcPolygonArea(topRight);
    let bottomLeftArea = calcPolygonArea(bottomLeft);
    let bottomRightArea = calcPolygonArea(bottomRight);
    let topLeftArea = calcPolygonArea(topLeft);
    let totalArea = calcPolygonArea(shape)

    let vals1_tr = getAverageXYValForPoly(topRight);
    let vals1_bl = getAverageXYValForPoly(bottomLeft);
    let vals1_br = getAverageXYValForPoly(bottomRight);
    let vals1_tl = getAverageXYValForPoly(topLeft);
    let total_val1 = Math.abs(vals1_tr.y_bar * topRightArea) + Math.abs(vals1_bl.y_bar * bottomLeftArea) - Math.abs(vals1_tl.y_bar * topLeftArea) - Math.abs(vals1_br.y_bar * bottomRightArea);
    total_val1 /= totalArea;
    // console.log( total_val1 );

    let vals2_tr = getAverageYSquaredValForPoly(topRight);
    let vals2_bl = getAverageYSquaredValForPoly(bottomLeft);
    let vals2_br = getAverageYSquaredValForPoly(bottomRight);
    let vals2_tl = getAverageYSquaredValForPoly(topLeft);
    let total_val2 = Math.abs(vals2_tr.y_bar * topRightArea) + Math.abs(vals2_bl.y_bar * bottomLeftArea) + Math.abs(vals2_tl.y_bar * topLeftArea) + Math.abs(vals2_br.y_bar * bottomRightArea);
    total_val2 /= totalArea;
    // console.log(total_val2);

    let vals3_tr = getAverageXSquaredValForPoly(topRight);
    let vals3_bl = getAverageXSquaredValForPoly(bottomLeft);
    let vals3_br = getAverageXSquaredValForPoly(bottomRight);
    let vals3_tl = getAverageXSquaredValForPoly(topLeft);

    let total_val3 = Math.abs(vals3_tr.y_bar * topRightArea) + Math.abs(vals3_bl.y_bar * bottomLeftArea) + Math.abs(vals3_tl.y_bar * topLeftArea) + Math.abs(vals3_br.y_bar * bottomRightArea);
    total_val3 /= totalArea;
    // console.log(total_val3);

    const ys_sum = Math.abs(total_val2);
    const xs_sum = Math.abs(total_val3);
    const xy_mult_sum = total_val1 * (1 / (4 / 3));

    let val = Math.pow(ys_sum, 2) / ((xs_sum * ys_sum) - Math.pow(xy_mult_sum, 2));
    return Math.sqrt(Math.sqrt(val));
}

function getk2val_shape(shape) {
    let cPoint = [0, 0];
    // shape = applyTransformationMatrixToAllKeypoints(shape, getSkewMatrix(45, 0));
    // shape = applyTransformationMatrixToAllKeypoints(shape, getScaleMatrix(2, 1));
    // shape = applyTransformationMatrixToAllKeypoints(shape, getRotationMatrix(45));
    let topHalfBottomHalf = splitShapeHorz_m(shape, cPoint);
    let bottomHalf = topHalfBottomHalf[0];
    let topHalf = topHalfBottomHalf[1];
    let rightHalfLeftHalf = splitShapeVert_m(topHalf, cPoint);
    let bottomRight = rightHalfLeftHalf[0];
    let bottomLeft = rightHalfLeftHalf[1];
    let rightHalfLeftHalf2 = splitShapeVert_m(bottomHalf, cPoint);
    let topRight = rightHalfLeftHalf2[0];
    let topLeft = rightHalfLeftHalf2[1];

    let topRightArea = calcPolygonArea(topRight);
    let bottomLeftArea = calcPolygonArea(bottomLeft);
    let bottomRightArea = calcPolygonArea(bottomRight);
    let topLeftArea = calcPolygonArea(topLeft);
    let totalArea = calcPolygonArea(shape)

    let vals1_tr = getAverageXYValForPoly(topRight);
    let vals1_bl = getAverageXYValForPoly(bottomLeft);
    let vals1_br = getAverageXYValForPoly(bottomRight);
    let vals1_tl = getAverageXYValForPoly(topLeft);
    let total_val1 = Math.abs(vals1_tr.y_bar * topRightArea) + Math.abs(vals1_bl.y_bar * bottomLeftArea) - Math.abs(vals1_tl.y_bar * topLeftArea) - Math.abs(vals1_br.y_bar * bottomRightArea);
    total_val1 /= totalArea;
    // console.log( total_val1 );

    let vals2_tr = getAverageYSquaredValForPoly(topRight);
    let vals2_bl = getAverageYSquaredValForPoly(bottomLeft);
    let vals2_br = getAverageYSquaredValForPoly(bottomRight);
    let vals2_tl = getAverageYSquaredValForPoly(topLeft);
    let total_val2 = Math.abs(vals2_tr.y_bar * topRightArea) + Math.abs(vals2_bl.y_bar * bottomLeftArea) + Math.abs(vals2_tl.y_bar * topLeftArea) + Math.abs(vals2_br.y_bar * bottomRightArea);
    total_val2 /= totalArea;
    // console.log(total_val2);

    let vals3_tr = getAverageXSquaredValForPoly(topRight);
    let vals3_bl = getAverageXSquaredValForPoly(bottomLeft);
    let vals3_br = getAverageXSquaredValForPoly(bottomRight);
    let vals3_tl = getAverageXSquaredValForPoly(topLeft);

    let total_val3 = Math.abs(vals3_tr.y_bar * topRightArea) + Math.abs(vals3_bl.y_bar * bottomLeftArea) + Math.abs(vals3_tl.y_bar * topLeftArea) + Math.abs(vals3_br.y_bar * bottomRightArea);
    total_val3 /= totalArea;
    // console.log(total_val3);

    const ys_sum = Math.abs(total_val2);
    const xs_sum = Math.abs(total_val3);
    const xy_mult_sum = total_val1 * (1 / (4 / 3));

    let val = Math.pow(ys_sum, 2) / ((xs_sum * ys_sum) - Math.pow(xy_mult_sum, 2));
    let vfin = Math.sqrt(Math.sqrt(val));
    return (-1 * vfin * xy_mult_sum) / ys_sum;
}


function letGetTheValsForAPoly(shape) {
    let cPoint = [0,0];
    let topHalfBottomHalf = splitShapeHorz_m(shape, cPoint);
    let bottomHalf = topHalfBottomHalf[0];
    let topHalf = topHalfBottomHalf[1];
    let rightHalfLeftHalf = splitShapeVert_m(topHalf, cPoint);
    let bottomRight = rightHalfLeftHalf[0];
    let bottomLeft = rightHalfLeftHalf[1];
    let rightHalfLeftHalf2 = splitShapeVert_m(bottomHalf, cPoint);
    let topRight = rightHalfLeftHalf2[0];
    let topLeft = rightHalfLeftHalf2[1];

    let topRightArea = calcPolygonArea(topRight);
    let bottomLeftArea = calcPolygonArea(bottomLeft);
    let bottomRightArea = calcPolygonArea(bottomRight);
    let topLeftArea = calcPolygonArea(topLeft);
    let totalArea = calcPolygonArea(shape)

    let vals1_tr = getAverageXYValForPoly(topRight);
    let vals1_bl = getAverageXYValForPoly(bottomLeft);
    let vals1_br = getAverageXYValForPoly(bottomRight);
    let vals1_tl = getAverageXYValForPoly(topLeft);
    let total_val1 = Math.abs(vals1_tr.y_bar * topRightArea) + Math.abs(vals1_bl.y_bar * bottomLeftArea) - Math.abs(vals1_tl.y_bar * topLeftArea) - Math.abs(vals1_br.y_bar * bottomRightArea);
    total_val1 /= totalArea;

    let vals2_tr = getAverageYSquaredValForPoly(topRight);
    let vals2_bl = getAverageYSquaredValForPoly(bottomLeft);
    let vals2_br = getAverageYSquaredValForPoly(bottomRight);
    let vals2_tl = getAverageYSquaredValForPoly(topLeft);
    let total_val2 = Math.abs(vals2_tr.y_bar * topRightArea) + Math.abs(vals2_bl.y_bar * bottomLeftArea) + Math.abs(vals2_tl.y_bar * topLeftArea) + Math.abs(vals2_br.y_bar * bottomRightArea);
    total_val2 /= totalArea;

    let vals3_tr = getAverageXSquaredValForPoly(topRight);
    let vals3_bl = getAverageXSquaredValForPoly(bottomLeft);
    let vals3_br = getAverageXSquaredValForPoly(bottomRight);
    let vals3_tl = getAverageXSquaredValForPoly(topLeft);

    let total_val3 = Math.abs(vals3_tr.y_bar * topRightArea) + Math.abs(vals3_bl.y_bar * bottomLeftArea) + Math.abs(vals3_tl.y_bar * topLeftArea) + Math.abs(vals3_br.y_bar * bottomRightArea);
    total_val3 /= totalArea;

    const ys_sum = Math.abs(total_val2);
    const xs_sum = Math.abs(total_val3);
    const xy_mult_sum = total_val1*(1/(4/3));

    let val = Math.pow(ys_sum, 2)/( (xs_sum*ys_sum) - Math.pow(xy_mult_sum, 2) );
    let valfin = Math.sqrt( Math.sqrt( val ) );
    // console.log(valfin);
    let skewval = (-1 * valfin * xy_mult_sum) / ys_sum;
    return {
        xs_sum: xs_sum,
        ys_sum: ys_sum,
        xy_mult_sum: xy_mult_sum,
        ratioOfY_XY: xy_mult_sum/ys_sum,
    }

}

function top_xy_x_part(m, c, x) {
    return (m*Math.pow(x,4)/4.0) + (c*Math.pow(x, 3)/3.0);
}

function top_xy_y_part(m, c, x) {
    //((c^2 x^2)/2 + (2 c k x^3)/3 + (k^2 x^4)/4)/2
    return (
        (Math.pow(c,2)*Math.pow(x,2)/2.0)
        + (c*m*Math.pow(x,3)*(2.0/3.0))
        + (Math.pow(m,2)*Math.pow(x,4)/4.0)
    )*(1.0/2.0);
}

function get_xy_y_part(m, c, x1, x2) {
    const ret = top_xy_y_part(m, c, x2) - top_xy_y_part(m, c, x1);

    //console.log("getting y_hat "+ret+" for equation is (" + m + ")x^2 + (" + (c) + ")x");

    return ret;
}

function y_squared_y_part_top(m, c, x) {
    if (m == 0)
        return (Math.pow(c, 3)*x)/4.0;
    //(c + k x)^4/(8 k)
    return (Math.pow(c + m*x, 4)/(16.0*m))
}

function get_y_squared_y_part(m, c, x1, x2) {
    const ret = ((y_squared_y_part_top(m, c, x2) - y_squared_y_part_top(m, c, x1)));

    // console.log("equation is (" + (Math.pow(m,2) + ")x^2 + (" + (2*m*c) + ")x + " + (Math.pow(c,2))+""));

    return ret;
}

function get_y_squared_x_part_wrapper(p1, p2) {
    let x1 = p1[0];
    let y1 = p1[1];
    let x2 = p2[0];
    let y2 = p2[1];
    const m = getSlopeOfLine(y2, y1, x2, x1);
    const c = getConstantofLineWithSlope(y2, y1, x2, x1);
    return get_y_squared_x_part(m, c, x1, x2);
}

function get_xy_y_part_wrapper(p1, p2) {
    let x1 = p1[0];
    let y1 = p1[1];
    let x2 = p2[0];
    let y2 = p2[1];
    const m = getSlopeOfLine(y2, y1, x2, x1);
    const c = getConstantofLineWithSlope(y2, y1, x2, x1);
    return get_xy_y_part(m, c, x1, x2);
}

function get_xy_x_part_wrapper(p1, p2) {
    let x1 = p1[0];
    let y1 = p1[1];
    let x2 = p2[0];
    let y2 = p2[1];
    const m = getSlopeOfLine(y2, y1, x2, x1);
    const c = getConstantofLineWithSlope(y2, y1, x2, x1);
    return get_xy_x_part(m, c, x1, x2);
}

function get_y_squared_y_part_wrapper(p1, p2) {
    let x1 = p1[0];
    let y1 = p1[1];
    let x2 = p2[0];
    let y2 = p2[1];
    const m = getSlopeOfLine(y2, y1, x2, x1);
    const c = getConstantofLineWithSlope(y2, y1, x2, x1);
    return get_y_squared_y_part(m, c, x1, x2);
}

function drawCenterOfGravityHalfPoints(ctx, fixedHitPoints, cPoint) {
    cPoint = (cPoint == undefined)? [0,0] : cPoint;

    const topHalfBottomHalf = splitShapeHorz_m(fixedHitPoints, cPoint);
    const topHalfPoint = findCentroid(topHalfBottomHalf[0]);
    const rightHalfLeftHalf = splitShapeVert_m(fixedHitPoints, cPoint);
    const topRightPoint = findCentroid(rightHalfLeftHalf[0]);
    drawPoints_m(ctx, [topHalfPoint, topRightPoint], "green");
}

function paintUiResult(cPoint, fixMat, resHitPoints, c_result, image)
{
    var imgmat = getIdentityMatrix();
    imgmat = matrixMultiply(getTranslateMatrix(-cPoint[0], -cPoint[1]), imgmat);
    imgmat = matrixMultiply(fixMat, imgmat);
    imgmat = matrixMultiply(getTranslateMatrix(200, 200), imgmat);
    drawImageWithTransformations(c_result.ctx, image, imgmat);

    drawPoint_m(c_result.ctx_ui, [200, 200], "blue");
    drawPoints_m(c_result.ctx_ui, resHitPoints, "red");

    drawCanvasMiddleLines(c_result.ctx_ui);
}

function drawTransformedCircle(canvasObj, mat, radius, colour) {
    colour = (colour == undefined)? 'blue' : colour;
    canvasObj.ctx_ui.save();
    canvasTransform(canvasObj.ctx_ui, mat);
    drawCircle(canvasObj.ctx_ui, [0,0], radius, colour);
    canvasObj.ctx_ui.restore();
}

function drawAltCircle(hitPoints1Obj, hitPoints2Obj, image1ZeroPointFixMat, image2ZeroPointFixMat) {
    const c_imageNoChanges = getCanvas("imageNoChanges");
    const c_inputImage1 = getCanvas("inputImage1");
    const c_inputImage2 = getCanvas("inputImage2");
    const c_preppedImage1 = getCanvas("preppedImage1");
    const c_preppedImage2 = getCanvas("preppedImage2");
    const c_resultImage1 = getCanvas("imageResult1");
    const c_resultImage2 = getCanvas("imageResult2");

    // let r1 = getTheRadius(hitPoints1Obj.hitpoints_c, hitPoints1Obj.centroid);
    // let invMat = getIdentityMatrix();
    // invMat = matrixMultiply(image1ZeroPointFixMat, invMat);
    // invMat = matrixMultiply(getTranslateMatrix(cPoint[0], cPoint[1]), invMat);

    let radius = FIXED_SHAPE_SCALE*CIRCLE_RADIUS_MULT;
    // drawTransformedCircle(c_resultImage1, getTranslateMatrix(200, 200), radius);
    // drawTransformedCircle(c_resultImage2, getTranslateMatrix(200, 200), radius);

    // drawPoint_m(c_resultImage1.ctx, [200, 200+FIXED_SHAPE_SCALE]);
    // drawPoint_m(c_resultImage1.ctx, [200+FIXED_SHAPE_SCALE, 200]);
    //
    // drawPoint_m(c_resultImage2.ctx, [200, 200+FIXED_SHAPE_SCALE]);
    // drawPoint_m(c_resultImage2.ctx, [200+FIXED_SHAPE_SCALE, 200]);

    const pt1 = matrixMultiply(getTranslateMatrix_point(hitPoints1Obj.centroid), math.inv(image1ZeroPointFixMat));
    const pt2 = matrixMultiply(getTranslateMatrix_point(hitPoints2Obj.centroid), math.inv(image2ZeroPointFixMat));
    // drawTransformedCircle(c_preppedImage1, pt1, radius);
    // drawTransformedCircle(c_preppedImage2, pt2, radius);

    // drawTransformedCircle(c_inputImage1, pt1, radius);
    // drawTransformedCircle(c_inputImage2, pt2, radius);

    const org_t1 = matrixMultiply(math.inv(g_globalState.inputImage1Mat), pt1);
    const org_t2 = matrixMultiply(math.inv(g_globalState.inputImage2Mat), pt2);
    // drawTransformedCircle(c_imageNoChanges, org_t1, radius);
    // drawTransformedCircle(c_imageNoChanges, org_t2, radius, 'green');

    const inputImg_t1 = matrixMultiply(g_globalState.inputImage2Mat, org_t1);
    const inputImg_t2 = matrixMultiply(g_globalState.inputImage1Mat, org_t2);
    // drawTransformedCircle(c_inputImage2, inputImg_t1, radius, 'green');
    // drawTransformedCircle(c_inputImage1, inputImg_t2, radius, 'green');
    //
    // drawTransformedCircle(c_preppedImage2, inputImg_t1, radius, 'green');
    // drawTransformedCircle(c_preppedImage1, inputImg_t2, radius, 'green');

    let invres_t1 = matrixMultiply(getTranslateMatrix_point(hitPoints2Obj.centroid, -1), inputImg_t1);
    invres_t1 = matrixMultiply(image2ZeroPointFixMat, invres_t1);
    invres_t1 = matrixMultiply(getTranslateMatrix(200, 200), invres_t1);
    let invres_t2 = matrixMultiply(getTranslateMatrix_point(hitPoints1Obj.centroid, -1), inputImg_t2);
    invres_t2 = matrixMultiply(image1ZeroPointFixMat, invres_t2);
    invres_t2 = matrixMultiply(getTranslateMatrix(200, 200), invres_t2);

    // drawTransformedCircle(c_resultImage2, invres_t1, radius, 'green');
    // drawLineWithTransformation(c_resultImage2, [[0,0], [0,200]], invres_t1, 'green');
    // drawLineWithTransformation(c_resultImage2, [[0,0], [200,0]], invres_t1, 'green');
    // drawLineWithTransformation(c_resultImage2, [[0,0], [0,1000]], getTranslateMatrix(200, 0), 'black');
    // drawLineWithTransformation(c_resultImage2, [[0,0], [1000,0]], getTranslateMatrix(0, 200), 'black');

    // drawTransformedCircle(c_resultImage1, invres_t2, radius, 'green');
    // drawLineWithTransformation(c_resultImage1, [[0,0], [0,200]], invres_t2, 'green');
    // drawLineWithTransformation(c_resultImage1, [[0,0], [200,0]], invres_t2, 'green');
    // drawLineWithTransformation(c_resultImage1, [[0,0], [0,1000]], getTranslateMatrix(200, 0), 'black');
    // drawLineWithTransformation(c_resultImage1, [[0,0], [1000,0]], getTranslateMatrix(0, 200), 'black');
    //
    // drawSquareWithTransformation(c_resultImage1, [200,200], radius, getIdentityMatrix(), 'red')
    // drawSquareWithTransformation(c_resultImage2, [0,0], radius, invres_t1, 'green')
    // drawSquareWithTransformation(c_resultImage2, [200,200], radius, getIdentityMatrix(), 'red')
    // drawSquareWithTransformation(c_resultImage1, [0,0], radius, invres_t2, 'green')
}

function changeImgSrc(newSrc) {
    g_src = newSrc;
    g_img.src = newSrc;
    draw();
}

const shapes = [
    square_shape,
    square_shape2,
    triangle_shape,
    shape1_shape,
    square_shape_small
];

function setShape(index) {
    g_shape_index = index;
    g_shape = shapes[index];
    draw();
}

function getIdentityMatrix() {
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];
}

var TARGET_TRIANGLE_SCALE = {x: 100, y: 100};
function getTargetTriangle() {
    var targetTriangle = [
        {x: 0, y: 0},
        {x: .5 * TARGET_TRIANGLE_SCALE.x, y: 1 * TARGET_TRIANGLE_SCALE.y},
        {x: 1 * TARGET_TRIANGLE_SCALE.x, y: 0}
    ];
    return targetTriangle;
}

function drawfrag(ctx, img, imgmat) {
    let matfrag1 = getIdentityMatrix();
    // matfrag1 = matrixMultiply(getTranslateMatrix(-16, -16), matfrag1);
    matfrag1 = matrixMultiply(imgmat, matfrag1);
    // matfrag1 = matrixMultiply(getTranslateMatrix(16, 16), matfrag1);

    ctx.imageSmoothingEnabled = true;
    ctx.webkitImageSmoothingEnabled = true;
    ctx.mozImageSmoothingEnabled = true;

    ctx.save();
    canvasTransform(ctx, matfrag1);
    ctx.drawImage(img, 0, 0, 400, 400);
    ctx.restore();
}

function prepImage(ctx)
{
    var t = document.getElementById("tempCanvas");

    if (!SKIP_BLUR) {
        processImage(ctx.canvas, "tempCanvas", BLUR_RADIUS, false);
        ctx = t.getContext("2d");
    }

    var imageOut = new MarvinImage(400, 400);
    var imagein = new MarvinImage(400, 400);
    imagein.imageData = ctx.getImageData(0, 0, 400, 400);
    Marvin.prewitt(imagein, imageOut);
    Marvin.invertColors(imageOut, imageOut);
    Marvin.thresholding(imageOut, imageOut, 150);
    imageOut.draw(t);

    let data_ = document.getElementById("tempCanvas").getContext("2d").getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    let data = data_.data;
    let splits = COLOUR_SPLITS;
    for (let i = 0; i < data.length; i+=4) {
        var val = ((data[i] + data[i+1] + data[i+2])/3.0);
        val = Math.floor(val/(256/splits)) * (256/splits);
        data[i]   = val;
        data[i+1] = val;
        data[i+2] = val;
        data[i+3] = 255;
    }
    return data_;
}

function _getCanvas(id, cleanBase, cleanUI) {
    let c = document.getElementById(id);
    let ctx = c.getContext("2d");
    if (cleanBase)
        ctx.clearRect(0, 0, c.width, c.height);
    let c_ui = document.getElementById(id + "_ui");
    let ctx_ui = c_ui.getContext("2d");
    if (cleanUI)
        ctx_ui.clearRect(0, 0, c.width, c.height);
    return {
        c: c,
        ctx: ctx,
        c_ui: c_ui,
        ctx_ui: ctx_ui,
    }
}

function getCanvas(id) {
    return _getCanvas(id, false, false)
}

function getCleanUICanvas(id) {
    return _getCanvas(id, false, true)
}

function getCleanCanvas(id) {
    return _getCanvas(id, true, true)
}

function getImageData(cleanCanvasObj) {
    return cleanCanvasObj.ctx.getImageData(0, 0, cleanCanvasObj.c.width, cleanCanvasObj.c.height).data
}

function getHitPointsWithCanvas(preppedImageCanvasObj, clickedPoint) {
    const preppedImageData = getImageData(preppedImageCanvasObj);
    return getHitPoints(preppedImageCanvasObj.c, preppedImageData, clickedPoint);
}

function getCenteredHitPointsWithCanvas(preppedImageCanvasObj, clickedPoint) {
    const hitPoints = getHitPointsWithCanvas(preppedImageCanvasObj, clickedPoint);
    const hitPoints_centroid = findCentroid(hitPoints);
    const tranmat = getTranslateMatrix(-hitPoints_centroid[0], -hitPoints_centroid[1]);
    return {
        hitpoints_c: applyTransformationMatrixToAllKeypoints(hitPoints, tranmat),
        centroid: hitPoints_centroid
    };
}

function getImage1HitPoints(clickedPoint) {
    const c_preppedImage1 = getCanvas("preppedImage1");
    return getCenteredHitPointsWithCanvas(c_preppedImage1, clickedPoint);
}

function getImage2HitPoints(clickedPoint) {
    const c_preppedImage2 = getCanvas("preppedImage2");
    return getCenteredHitPointsWithCanvas(c_preppedImage2, clickedPoint);
}
var g_tomsrot = 0
function getRotationFixHack(hitPoints1Obj, hitPoints2Obj, image1ZeroPointFixMat_withoutRotationFix, image2ZeroPointFixMat) {

    const pt2 = matrixMultiply(getTranslateMatrix_point(hitPoints2Obj.centroid), math.inv(image2ZeroPointFixMat));
    const org_t2 = matrixMultiply(math.inv(g_globalState.inputImage2Mat), pt2);
    const inputImg_t2 = matrixMultiply(g_globalState.inputImage1Mat, org_t2);
    let invres_t2 = matrixMultiply(getTranslateMatrix_point(hitPoints1Obj.centroid, -1), inputImg_t2);
    invres_t2 = matrixMultiply(image1ZeroPointFixMat_withoutRotationFix, invres_t2);
    const rotPt1 = applyTransformationMatrixToPoint_m([100, 0], invres_t2);
    const rotPt_zero = applyTransformationMatrixToPoint_m([0, 0], invres_t2);
    const diffY = (rotPt1[1] - rotPt_zero[1]);
    const diffX = (rotPt1[0] - rotPt_zero[0]);
    const ratio = diffY/diffX;
    const angle = Math.atan(ratio)*180.0/Math.PI;
    return matrixMultiply(getRotationMatrix( 0), image1ZeroPointFixMat_withoutRotationFix);
}

function getRotationHack(imgmat2) {
    return imgmat2;
}

function g_getClickedPoint() {
    const clicked_x = Math.round( g_globalState.canvasClickLocation.x*imgw );
    const clicked_y = Math.round( g_globalState.canvasClickLocation.y*imgh );
    const _clickedPoint = [clicked_x, clicked_y];
    const inputImage1ClickedPoint = applyTransformationMatrixToPoint_m(_clickedPoint, g_globalState.inputImage1Mat);
    const inputImage2ClickedPoint = applyTransformationMatrixToPoint_m(_clickedPoint, g_globalState.inputImage2Mat);

    return {
        orgImage: _clickedPoint,
        inputImage1: inputImage1ClickedPoint,
        inputImage2: inputImage2ClickedPoint,
    };
}

function drawResultImages(hitPoints1Obj, hitPoints2Obj, image1ZeroPointFixMat, image2ZeroPointFixMat,
                          image1ZeroPointFixMat_woutScaleFix, image2ZeroPointFixMat_woutScaleFix) {
    const c_inputImage1 = getCanvas("inputImage1");
    const c_inputImage2 = getCanvas("inputImage2");
    const c_resultImage1 = getCanvas("imageResult1");
    const c_resultImage1_withScaleFix = getCanvas("imageResult1_fix_scale");
    const c_resultImage2 = getCanvas("imageResult2");
    const c_resultImage2_withScaleFix = getCanvas("imageResult2_fix_scale");
    const c_resultImage1_fixRot = getCanvas("imageResult1_fix_rot");

    let image1Mat = getIdentityMatrix();
    image1Mat = matrixMultiply(getTranslateMatrix(-hitPoints1Obj.centroid[0], -hitPoints1Obj.centroid[1]), image1Mat);
    image1Mat = matrixMultiply(image1ZeroPointFixMat_woutScaleFix, image1Mat);
    image1Mat = matrixMultiply(getTranslateMatrix(200, 200), image1Mat);
    drawImageWithTransformations(c_resultImage1.ctx, c_inputImage1.c, image1Mat);

    image1Mat = getIdentityMatrix();
    image1Mat = matrixMultiply(getTranslateMatrix(-hitPoints1Obj.centroid[0], -hitPoints1Obj.centroid[1]), image1Mat);
    image1Mat = matrixMultiply(image1ZeroPointFixMat, image1Mat);
    image1Mat = matrixMultiply(getTranslateMatrix(200, 200), image1Mat);
    drawImageWithTransformations(c_resultImage1_withScaleFix.ctx, c_inputImage1.c, image1Mat);

    let image2Mat = getIdentityMatrix();
    image2Mat = matrixMultiply(getTranslateMatrix(-hitPoints2Obj.centroid[0], -hitPoints2Obj.centroid[1]), image2Mat);
    image2Mat = matrixMultiply(image2ZeroPointFixMat_woutScaleFix, image2Mat);
    image2Mat = matrixMultiply(getTranslateMatrix(200, 200), image2Mat);
    drawImageWithTransformations(c_resultImage2.ctx, c_inputImage2.c, image2Mat);

    image2Mat = getIdentityMatrix();
    image2Mat = matrixMultiply(getTranslateMatrix(-hitPoints2Obj.centroid[0], -hitPoints2Obj.centroid[1]), image2Mat);
    image2Mat = matrixMultiply(image2ZeroPointFixMat, image2Mat);
    image2Mat = matrixMultiply(getTranslateMatrix(200, 200), image2Mat);
    drawImageWithTransformations(c_resultImage2_withScaleFix.ctx, c_inputImage2.c, image2Mat);

    image2Mat = getIdentityMatrix();
    image2Mat = matrixMultiply(getTranslateMatrix(-hitPoints1Obj.centroid[0], -hitPoints1Obj.centroid[1]), image2Mat);
    image2Mat = matrixMultiply(matrixMultiply(getRotationMatrix(g_tomsrot), image1ZeroPointFixMat), image2Mat);
    image2Mat = matrixMultiply(getTranslateMatrix(200, 200), image2Mat);
    drawImageWithTransformations(c_resultImage1_fixRot.ctx, c_inputImage1.c, image2Mat);
}

function drawFragments(hitPoints1Obj, hitPoints2Obj, image1ZeroPointFixMat, image2ZeroPointFixMat) {
    const c_inputImage1 = getCanvas("inputImage1");
    const c_inputImage2 = getCanvas("inputImage2");
    const c_fragment1 = getCleanCanvas("drawFragment1");
    const c_fragment2 = getCleanCanvas("drawFragment2");

    let radius = FIXED_SHAPE_SCALE*CIRCLE_RADIUS_MULT;
    let scale = (16/radius);

    let image1Mat = getIdentityMatrix();
    image1Mat = matrixMultiply(getTranslateMatrix(-hitPoints1Obj.centroid[0], -hitPoints1Obj.centroid[1]), image1Mat);
    image1Mat = matrixMultiply(image1ZeroPointFixMat, image1Mat);
    image1Mat = matrixMultiply(getScaleMatrix(scale, scale), image1Mat);
    image1Mat = matrixMultiply(getTranslateMatrix(16, 16), image1Mat);
    drawfrag(c_fragment1.ctx, c_inputImage1.c, image1Mat, 0);

    let image2Mat = getIdentityMatrix();
    image2Mat = matrixMultiply(getTranslateMatrix(-hitPoints2Obj.centroid[0], -hitPoints2Obj.centroid[1]), image2Mat);
    image2Mat = matrixMultiply(image2ZeroPointFixMat, image2Mat);
    image2Mat = matrixMultiply(getScaleMatrix(scale, scale), image2Mat);
    image2Mat = matrixMultiply(getTranslateMatrix(16, 16), image2Mat);
    drawfrag(c_fragment2.ctx, c_inputImage2.c, image2Mat, 0);

    const dist = distance(pHash(c_fragment2.c), pHash(c_fragment1.c));
    $("#hashDistance").html("" + dist);
}

function drawUIElements(hitPoints1Obj, hitPoints2Obj, image1ZeroPointFixMat, image2ZeroPointFixMat,
                        image1ZeroPointFixMat_woutScaleFix, image2ZeroPointFixMat_woutScaleFix, image2ZeroPointFixMat_rotFix) {
    const c_imageNoChanges = getCanvas("imageNoChanges");
    const c_inputImage1 = getCanvas("inputImage1");
    const c_inputImage2 = getCanvas("inputImage2");
    const c_preppedImage1 = getCanvas("preppedImage1");
    const c_preppedImage2 = getCanvas("preppedImage2");
    const c_resultImage1 = getCanvas("imageResult1");
    const c_resultImage1_b = getCanvas("imageResult1_b");
    const c_resultImage2 = getCanvas("imageResult2");
    const clickedPoint = g_getClickedPoint();

    // drawPoint_m(c_imageNoChanges.ctx_ui, clickedPoint.orgImage, "blue", 5);
    //
    // drawPoint_m(c_inputImage1.ctx_ui, clickedPoint.inputImage1, "blue", 5);
    // drawPoint_m(c_inputImage2.ctx_ui, clickedPoint.inputImage2, "blue", 5);

    let t1 = getTranslateMatrix(hitPoints1Obj.centroid[0], hitPoints1Obj.centroid[1]);
    let h1 = applyTransformationMatrixToAllKeypoints(hitPoints1Obj.hitpoints_c, t1);
    drawPoints_m(c_inputImage1.ctx_ui, h1, "red", 1);
    drawPoints_m(c_preppedImage1.ctx_ui, h1, "red", 1);
    // drawPoint_m(c_preppedImage1.ctx_ui, clickedPoint.inputImage1, "blue", 5);

    let t2 = getTranslateMatrix(hitPoints2Obj.centroid[0], hitPoints2Obj.centroid[1]);
    let h2 = applyTransformationMatrixToAllKeypoints(hitPoints2Obj.hitpoints_c, t2);
    drawPoints_m(c_inputImage2.ctx_ui, h2, "red", 1);
    drawPoints_m(c_preppedImage2.ctx_ui, h2, "red", 1);
    // drawPoint_m(c_preppedImage2.ctx_ui, clickedPoint.inputImage2, "blue", 5);

    let c_mat = getTranslateMatrix(200, 200);

    let r1 = applyTransformationMatrixToAllKeypoints(hitPoints1Obj.hitpoints_c, matrixMultiply(c_mat, image1ZeroPointFixMat_woutScaleFix));
    let r1_b = applyTransformationMatrixToAllKeypoints(hitPoints1Obj.hitpoints_c, matrixMultiply(c_mat, image1ZeroPointFixMat_woutScaleFix));
    drawPoints_m(c_resultImage1.ctx_ui, r1, "red", 1);
    // drawPoint_m(c_resultImage1.ctx_ui, [200,200], "blue", 5);

    let r2 = applyTransformationMatrixToAllKeypoints(hitPoints2Obj.hitpoints_c, matrixMultiply(c_mat, image2ZeroPointFixMat_woutScaleFix));
    drawPoints_m(c_resultImage2.ctx_ui, r2, "red", 1);
    // drawPoint_m(c_resultImage2.ctx_ui, [200,200], "blue", 5);

    // drawPolyFull(c_inputImage1.ctx_ui, r1);
    // drawPolyFull(c_inputImage2.ctx_ui, r2);

    const c_shapePreppedImage1 = getCanvas("shapePreppedImage1");
    const c_shapePreppedImage2 = getCanvas("shapePreppedImage2");
    const c_shapeResult1 = getCanvas("shapeResult1");
    const c_shapeResult2 = getCanvas("shapeResult2");
    const c_shapeResult1_fixScale = getCanvas("shapeResult1_fix_scale");
    const c_shapeResult2_fixScale = getCanvas("shapeResult2_fix_scale");
    const c_shapeResult1_fix_rot = getCanvas("shapeResult1_fix_rot");

    let c1 = getTranslateMatrix(hitPoints1Obj.centroid[0], hitPoints1Obj.centroid[1]);
    drawPolyFull(c_shapePreppedImage1.ctx_ui, applyTransformationMatrixToAllKeypoints(hitPoints1Obj.hitpoints_c, c1));
    let c2 = getTranslateMatrix(hitPoints2Obj.centroid[0], hitPoints2Obj.centroid[1]);
    drawPolyFull(c_shapePreppedImage2.ctx_ui, applyTransformationMatrixToAllKeypoints(hitPoints2Obj.hitpoints_c, c2));

    drawPolyFull(c_shapeResult1.ctx_ui, r1);
    drawPolyFull(c_resultImage1_b.ctx_ui, r1_b);

    drawPolyFull(c_shapeResult2.ctx_ui, r2);

    r1 = applyTransformationMatrixToAllKeypoints(hitPoints1Obj.hitpoints_c, matrixMultiply(c_mat, image1ZeroPointFixMat));
    drawPolyFull(c_shapeResult1_fixScale.ctx_ui, r1);

    r1 = applyTransformationMatrixToAllKeypoints(hitPoints1Obj.hitpoints_c, matrixMultiply(c_mat, matrixMultiply(getRotationMatrix(g_tomsrot), image1ZeroPointFixMat)));
    drawPolyFull(c_shapeResult1_fix_rot.ctx_ui, r1);

    r2 = applyTransformationMatrixToAllKeypoints(hitPoints2Obj.hitpoints_c, matrixMultiply(c_mat, image2ZeroPointFixMat));
    drawPolyFull(c_shapeResult2_fixScale.ctx_ui, r2);

    // c_shapeResult2.ctx_ui.globalAlpha = 0.4;
    // drawPolyFull(c_shapeResult2.ctx_ui, r1);
    // c_shapeResult2.ctx_ui.globalAlpha = 1;
    //
    // c_shapeResult1.ctx_ui.globalAlpha = 0.4;
    // drawPolyFull(c_shapeResult1.ctx_ui, r2);
    // c_shapeResult1.ctx_ui.globalAlpha = 1;

    drawAltCircle(hitPoints1Obj, hitPoints2Obj, image1ZeroPointFixMat_woutScaleFix, image2ZeroPointFixMat_woutScaleFix);
}

function wipeCanvases() {
    //only need to wipe the ui layer
    getCleanUICanvas("imageNoChanges");
    getCleanUICanvas("inputImage1");
    getCleanUICanvas("inputImage2");
    getCleanUICanvas("preppedImage1");
    getCleanUICanvas("preppedImage2");

    //wipe the whole thing
    getCleanCanvas("shapePreppedImage1");
    getCleanCanvas("shapePreppedImage2");
    getCleanCanvas("shapeResult1");
    getCleanCanvas("shapeResult2");
    getCleanCanvas("imageResult1");
    getCleanCanvas("imageResult2");
    getCleanCanvas("drawFragment1");
    getCleanCanvas("drawFragment2");

    getCleanCanvas("shapePreppedImage1");
    getCleanCanvas("shapePreppedImage2");
    getCleanCanvas("shapeResult1");
    getCleanCanvas("shapeResult2");
    getCleanCanvas("shapeResult1_fix_scale");
    getCleanCanvas("shapeResult2_fix_scale");
    getCleanCanvas("shapeResult1_fix_rot");
}

function drawPointOfRotation(ctx, shape, rotation) {

    let cPoint = findCentroid(shape);

    let transMat = getIdentityMatrix();
    transMat = matrixMultiply(getTranslateMatrix_point(cPoint, -1), transMat);
    transMat = matrixMultiply(getRotationMatrix(rotation), transMat);
    transMat = matrixMultiply(getTranslateMatrix_point(cPoint), transMat);

    shape = applyTransformationMatrixToAllKeypoints(shape, transMat);

    let topHalfBottomHalf = splitShapeHorz_m(shape, cPoint);
    let bottomHalf = topHalfBottomHalf[0];
    let topHalf = topHalfBottomHalf[1];
    let rightHalfLeftHalf = splitShapeVert_m(shape, cPoint);
    let topRight = rightHalfLeftHalf[0];
    let topLeft = rightHalfLeftHalf[1];

    let bottomPoint = findCentroid(topHalf);
    let topPoint = findCentroid(bottomHalf);
    let rightPoint = findCentroid(topRight);
    let leftPoint = findCentroid(topLeft);

    let transMat2 = matrixMultiply(getTranslateMatrix_point(cPoint, -1), transMat);
    transMat2 = matrixMultiply(getRotationMatrix(30), transMat2);
    transMat2 = matrixMultiply(getTranslateMatrix_point(cPoint), transMat2);


    let shape2 = applyTransformationMatrixToAllKeypoints(shape, transMat2);
    let topHalfBottomHalf2 = splitShapeHorz_m(shape2, cPoint);
    let topHalf2 = topHalfBottomHalf2[0];
    let bottomHalf2 = topHalfBottomHalf2[1];
    let rightHalfLeftHalf2 = splitShapeVert_m(shape2, cPoint);
    let topRight2 = rightHalfLeftHalf2[0];
    let topLeft2 = rightHalfLeftHalf2[1];

    let bottomPoint2 = findCentroid(topHalf2);
    let topPoint2 = findCentroid(bottomHalf2);
    let rightPoint2 = findCentroid(topRight2);
    let leftPoint2 = findCentroid(topLeft2);
    //
    // let transMat2 = getIdentityMatrix();
    // transMat2 = matrixMultiply(getTranslateMatrix_point(cPoint, -1), transMat2);
    // // transMat2 = matrixMultiply(getRotationMatrix(-rotation), transMat2);
    // transMat2 = matrixMultiply(getTranslateMatrix_point(cPoint), transMat2);
    //
    // bottomPoint = applyTransformationMatrixToPoint(bottomPoint, transMat2)
    drawPoint_m(ctx, bottomPoint);
    //
    // topPoint = applyTransformationMatrixToPoint(topPoint, transMat2)
    drawPoint_m(ctx, topPoint);
    //
    // rightPoint = applyTransformationMatrixToPoint(rightPoint, transMat2)
    drawPoint_m(ctx, rightPoint, 'purple');
    //
    // leftPoint = applyTransformationMatrixToPoint(leftPoint, transMat2)
    drawPoint_m(ctx, leftPoint, 'pink');

    $("#topAvgX").html(     "The total x values: " + (Math.abs(rightPoint[0]-200)+Math.abs(leftPoint[0]-200)) );
    $("#bottomAvgX").html(  "The total y values: " + (Math.abs(rightPoint2[0]-200)+Math.abs(leftPoint2[0]-200)) );

    $("#leftAvgX").html(     "The total x values: " + (Math.abs(bottomPoint[1]-200)+Math.abs(topPoint[1]-200)) );
    $("#rightAvgX").html(  "The total y values: " + (Math.abs(bottomPoint2[1]-200)+Math.abs(topPoint2[1]-200)) );


    // $("#topAvgX").html(     "Top___ x: "+(bottomPoint[0] - 200));
    // $("#bottomAvgX").html(  "Bottom x: "+(topPoint[0] - 200));
    // $("#leftAvgX").html(    "Left__ x: "+(leftPoint[0] - 200));
    // $("#rightAvgX").html(   "Right_ x: "+(rightPoint[0] - 200));
    //
    // $("#topAvgY").html(     "Top___ y: "+(bottomPoint[1] - 200));
    // $("#bottomAvgY").html(  "Bottom y: "+(topPoint[1] - 200));
    // $("#leftAvgY").html(    "Left__ y: "+(leftPoint[1] - 200));
    // $("#rightAvgY").html(   "Right_ y: "+(rightPoint[1] - 200));

}

const yaw = 0.5, pitch = 0.5, width = 700, height = 400, drag = false;

function dataFromFormular(func) {
    var output = [];
    for (var x = -20; x < 20; x++) {
        var f0 = [];
        output.push(f0);
        for (var y = -20; y < 20; y++) {
            f0.push(func(x, y));
        }
    }
    return output;
}

const square_shape_inner = [[-1, -1], [-1, 1], [1, 1], [1, -1]];

function getSumVal(shape, a, b) {
    //FIXME: we should just have a max val and tweak it
    if (a == 0)
        a = 0.001;

    const inShape = applyTransformationMatrixToAllKeypoints(shape, [[a, b], [0, 1.0 / a]]);
    let result = 0;
    for (let i = 0; i < inShape.length; i++) {
        result += inShape[i][0] ** 2 + inShape[i][1] ** 2;
    }
    return result;
}

function abtoSelection(a, b, plotlyplot) {

    let xidx = (a + 1) * plotlyplot.dataScaleX;
    let yidx = (b + 1) * plotlyplot.dataScaleY;
    return {
        object: plotlyplot.surface,
        index: [a, b],
        data: {
            index: [xidx, yidx],
            level: [-1, -1, -1],
        },
    }
}

