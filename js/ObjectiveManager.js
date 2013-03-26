function ObjectiveManager(srcUrl, opts) {
    var objs = null;

    $.getJSON(srcUrl, function(data) {
        objs = data;
        // console.log(objs);
    });
    
    return {
        increment: function (obj, inc) {
            var objective = objs[obj];
            if (objective) {
                objective.value += inc;
                // update progress bar
                $('#'+objective.domId).css({
		            width: ((objective.value > objective.obj) ? 100 : (100*objective.value/objective.obj)) + '%'
		        });
            }
            // TODO: action when 100% goal is reached
        }
    }
}

    
