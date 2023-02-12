
// #####
// #     # #####    ##   #    #
// #     # #    #  #  #  #    #
// #     # #    # #    # #    #
// #     # #####  ###### # ## #
// #     # #   #  #    # ##  ##
// #####   #    # #    # #    #
//draw


function drawline_m(ctx, inPoints, colour) {
    colour = (colour == undefined)? 'green' : colour;
    ctx.beginPath();
    ctx.strokeStyle = colour;
    ctx.moveTo(inPoints[0][0], inPoints[0][1]);
    for (var i = 1; i < inPoints.length; i++) {//i = 1 to skip first point
        ctx.lineTo(inPoints[i][0], inPoints[i][1]);
    }
    ctx.stroke();
}

function drawLineWithTransformation(canvasObj, inPoints, mat, colour) {
    canvasObj.ctx_ui.save();
    canvasTransform(canvasObj.ctx_ui, mat);
    drawline_m(canvasObj.ctx_ui, inPoints, colour);
    canvasObj.ctx_ui.restore();
}

function drawSquare(ctx, cPoint, radius, colour) {
    colour = (colour == undefined)? 'green' : colour;
    ctx.beginPath();
    ctx.strokeStyle = colour;
    ctx.strokeWidth = 1;
    ctx.lineWidth = 1;
    ctx.rect(cPoint[0]-radius, cPoint[1]-radius, radius*2, radius*2);
    ctx.stroke();
}

function drawCircle(ctx, cPoint, radius, colour) {
    ctx.beginPath();
    ctx.strokeStyle = (colour == undefined)? 'rgb(0, 0, 255)' : colour;
    ctx.arc(cPoint[0], cPoint[1], radius, 0, 2 * Math.PI);
    ctx.stroke();
}

function drawSquareWithTransformation(canvasObj, cPoint, radius, mat, colour) {
    canvasObj.ctx_ui.save();
    canvasTransform(canvasObj.ctx_ui, mat);
    drawSquare(canvasObj.ctx_ui, cPoint, radius, colour);
    canvasObj.ctx_ui.restore();
}

function drawPolygonPath_m(ctx, inPoints) {
    ctx.beginPath();
    ctx.moveTo(inPoints[0][0], inPoints[1][0]);
    for (var i = 1; i < inPoints[0].length; i++) {//i = 1 to skip first point
        ctx.lineTo(inPoints[0][i], inPoints[1][i]);
    }
    ctx.closePath();
    ctx.stroke();
}

function drawPolygonPath(ctx, inPoints) {
    ctx.beginPath();
    ctx.moveTo(inPoints[0][0], inPoints[0][1]);
    for (var i = 1; i < inPoints.length; i++) {//i = 1 to skip first point
        ctx.lineTo(inPoints[i][0], inPoints[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
}

function drawPolyFullNoFill(ctx, shape, stroke) {
    ctx.beginPath();
    drawPolygonPath(ctx, shape);
    //ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke;
    ctx.strokeWidth = 1;
    ctx.stroke();
}

function drawPolyFull(ctx, shape, stroke, fill) {
    ctx.beginPath();
    drawPolygonPath(ctx, shape);
    //ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = (stroke)? stroke : 'rgb(66,133,244)';
    ctx.strokeWidth = 100;
    ctx.fillStyle = (fill)? fill: 'rgba(66,133,244, .7)';
    ctx.fill('evenodd');
    ctx.stroke();
}

function drawImageWithTransformations(ctx, img, mat, width, height) {
    width = (width == undefined)? img.width : width;
    height = (height == undefined)? img.height : height;

    ctx.save();
    canvasTransform(ctx, mat);
    ctx.drawImage(img, 0, 0, width, height);
    ctx.restore();
}

function drawImageAndShapeWithTransformation(canvasId, img, shape, mat, width, height) {
    let canvasObj = getCleanCanvas(canvasId);
    drawImageWithTransformations(canvasObj.ctx, img, mat, width, height)
    shape = applyTransformationMatrixToAllKeypoints(shape, mat);
    drawPolyFull(canvasObj.ctx_ui, shape);
}

function drawPoint_m(interactiveCanvasContext, point, colour, width) {
    width = (width == undefined)? 3: width;
    interactiveCanvasContext.beginPath();
    interactiveCanvasContext.strokeWidth = 1;
    interactiveCanvasContext.strokeStyle = colour;
    interactiveCanvasContext.rect(point[0], point[1], width, width);
    interactiveCanvasContext.closePath();
    interactiveCanvasContext.stroke();
}

function drawImageWithTransformations_seg(ctx, img, mat) {
    ctx.imageSmoothingEnabled = true;
    ctx.webkitImageSmoothingEnabled = true;
    ctx.mozImageSmoothingEnabled = true;

    ctx.save();
    canvasTransform(ctx, mat);
    ctx.drawImage(img, 0, 0, 400, 400);
    ctx.restore();
}