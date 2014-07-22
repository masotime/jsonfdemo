'use strict';

var adaro = require('adaro'),
    rules = require('./specialization'),
    specializer = require('karka').create(rules),
    
    express = require('express'),
    app = express(),
    cookieParser = require('cookie-parser'),
    session      = require('express-session');

// this is all boilerplate stuff
app.use(cookieParser('keyboard cat'));
app.use(session({
    secret: 'keyboard cat',
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: null
    }
}));

app.use(express.static(__dirname + '/public'));
app.set('views','public/templates');
app.set('view engine', 'dust');


//Step 1: Decorate the engine that you feed into
//express app to first do the specialization map generation
function specializationInjector(engine) {

    return function(name, context /*, callback */) {
        //Step 2: Generate the specialization map on each render
        //for that context
        context._specialization = specializer.resolveAll(context);
        engine.apply(null, arguments);
    };
}


app.engine('dust', specializationInjector(adaro.dust({cache:false})));
//app.engine('dust', specialize(consolidate[engine]));


//Step 3: Use the hook in the rendering engine to switch
// the templates that are present in the map

var ExpressApplication = function() {

    var dust = require('dustjs-linkedin'),
        fs = require('fs'),
        path = require('path'),
        extend = require('util-extend');

    dust.onLoad = function(name, context, cb) {

        function constructFilePath(name) {
            var p;
            if (name.indexOf(app.get('views')) === -1) {
                p = path.join(app.get('views'), name);
            }
            return p + '.dust';
        }

        var specialization = context.get('_specialization');
        var resolvedName = (specialization && specialization[name]) || name;
        var dustTemplateToUse = constructFilePath( resolvedName );

        console.log( name + ' => ' + resolvedName + ':' + dustTemplateToUse);
        fs.readFile(dustTemplateToUse, 'utf8', cb);
    };

    // routes here
    app.get('/', function(req, res){
        var model = req.session && req.session.custom;
        res.render('index', model);
    });

    app.get('/setCustom', function(req, res) {
        if(!req.session.custom) {
            req.session.custom = {};
        }
        extend(req.session.custom, req.query);
        res.redirect('/');
    });    

    return app;
};

var app = ExpressApplication();

app.listen(8000, function (/* err */) {
    console.log('[%s] Listening on http://localhost:%d', app.settings.env, 8000);
});

