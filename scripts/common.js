// #     #                         ###
// #     #  ####  ###### #####      #  #    # #####  #    # #####
// #     # #      #      #    #     #  ##   # #    # #    #   #
// #     #  ####  #####  #    #     #  # #  # #    # #    #   #
// #     #      # #      #####      #  #  # # #####  #    #   #
// #     # #    # #      #   #      #  #   ## #      #    #   #
//  #####   ####  ###### #    #    ### #    # #       ####    #
//user input



function getCurrentPageMousePosition(e) {
    return [
        e.pageX,
        e.pageY
    ];
}


function getCurrentCanvasMousePosition(e, canvasElem) {
    if (e.originalEvent.changedTouches != null && canvasElem != null) {
        var rect = canvasElem.getBoundingClientRect();
        return [
            e.originalEvent.changedTouches[0].clientX - rect.left,
            e.originalEvent.changedTouches[0].clientY - rect.top
        ];
    } else if (e.clientX || e.clientX === 0 && canvasElem != null) {
        var rect = canvasElem.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    } else {
        console.log("Error: Invalid state");
    }
}