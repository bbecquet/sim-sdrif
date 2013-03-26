function ConstraintManager(srcUrl, opts) {
    var constraints = null;
    
    $.getJSON(srcUrl, function(data) {
        constraints = data;
        //console.log(constraints);
    });
    
    function checkConstraint (c, elements, callback) {
        for(var i=0;i<c.elementTypes.length;i++) {
            checkConstraintForElementType(c, c.elementTypes[i], elements, callback);
        }
    }
    
    function checkConstraintForElementType (c, elementType, elements, callback) {
        var elts = elements[elementType];
        if(elts) {
            var others = [];
            for(var i=0; i<c.others.length; i++) {
                if(elements[c.others[i]])
                    others = others.concat(elements[c.others[i]]);
            }
            for(var i=0;i<elts.length;i++) {
                if(callback) {
                    if (c.constraint == 'maxDist') {
                        callback(elts[i], c, checkMaxDistance(elts[i], others, c.distance));
                    } else if (c.constraint == 'minDist') {
                        callback(elts[i], c, checkMinDistance(elts[i], others, c.distance));
                    } else if (c.constraint == 'notInside') {
                        callback(elts[i], c, !checkInside(elts[i], others));
                    } else if (c.constraint == 'inside') {
                        callback(elts[i], c, checkInside(elts[i], others));
                    }
                }
            }
        }        
    }
    
    function checkInside (elt, others) {
        var isValid = false;
        for(var j=0; j<others.length && !isValid; j++) {
            //console.log('Checking dist(', elt.name, ',' , others[j].name, ') < ',distanceMax);
            isValid = (utils.isInside(elt.geom, others[j].geom));
        }
        return isValid;        
    }
    
    function checkMaxDistance (elt, others, distanceMax) {
        var isValid = false;
        for(var j=0; j<others.length && !isValid; j++) {
            isValid = (utils.distanceBetween(elt.geom, others[j].geom) < distanceMax);
        }
        return isValid;
    }
    
    function checkMinDistance (elt, others, distanceMin) {
        var isValid = false;
        for(var j=0; j<others.length && !isValid; j++) {
            isValid = (utils.distanceBetween(elt.geom, others[j].geom) > distanceMin);
        }
        return isValid;
    }
    
    return {
        constraints: constraints,
        // callback: function(elt, constraint, isValid)
        checkConstraints: function(elements, callback) {
            for(var i=0;i<constraints.length;i++) {
                checkConstraint(constraints[i], elements, callback);
            }
        }
    }
}
