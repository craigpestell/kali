module.exports = function (pb) {

    //PB dependencies
    var util = pb.util;
    var BaseController = pb.BaseController;

    // Instantiate the controller & extend from the base controller
    var LandingPage = function () {
    };
    util.inherits(LandingPage, pb.BaseController);

    // Define the content to be rendered
    //PB dependencies
    var PluginService = new pb.PluginService();


    LandingPage.prototype.render = function (cb) {
        // Allows us to call this.[whatever] from inside anonymous functions
        var self = this;
        var output = {
            content_type: 'text/html',
            code: 200
        };

        //Load the headline setting from the company plugin
        //    var pluginService = new PluginService();
        PluginService.getSetting('landing_page_headline', 'kali', function (err, headline) {
            //Load the subheader setting
            PluginService.getSetting('landing_page_subheader', 'kali', function (err, subheader) {
                // Register the custom directives
                self.ts.registerLocal('landing_page_headline', headline);
                self.ts.registerLocal('landing_page_subheader', subheader);
                self.ts.load('landing_page', function (error, result) {
                    output.content = result;
                    cb(output);
                });
            });
        });
    };
    // Define the routes for the controller
    LandingPage.getRoutes = function (cb) {
        var routes = [{
            method: 'get',
            path: "/",
            auth_required: false,
            content_type: 'text/html'
        }];
        cb(null, routes);
    };

    //return the prototype
    return LandingPage;
};
