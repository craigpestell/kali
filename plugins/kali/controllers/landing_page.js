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
        //determine and execute the proper call
        var section = self.req.pencilblue_section || null;
        var topic   = self.req.pencilblue_topic   || null;
        var article = self.req.pencilblue_article || null;
        var page    = self.req.pencilblue_page    || null;

        var contentService = new pb.ContentService(self.site, true);
        contentService.getSettings(function(err, contentSettings) {
            self.gatherData(function(err, data) {
                var articleService = new pb.ArticleService(self.site, true);
                articleService.getMetaInfo(data.content[0], function(err, meta) {

                    self.ts.reprocess = false;
                    self.ts.registerLocal('meta_keywords', meta.keywords);
                    self.ts.registerLocal('meta_desc', data.section.description || meta.description);
                    self.ts.registerLocal('meta_title', data.section.name || meta.title);
                    self.ts.registerLocal('meta_lang', pb.config.localization.defaultLocale);
                    self.ts.registerLocal('meta_thumbnail', meta.thumbnail);
                    self.ts.registerLocal('current_url', self.req.url);
                    self.ts.registerLocal('navigation', new pb.TemplateValue(data.nav.navigation, false));
                    self.ts.registerLocal('account_buttons', new pb.TemplateValue(data.nav.accountButtons, false));
                    self.ts.registerLocal('infinite_scroll', function(flag, cb) {
                        if(article || page) {
                            cb(null, '');
                        }
                        else {
                            var infiniteScrollScript = pb.ClientJs.includeJS('/js/infinite_article_scroll.js');
                            if(section) {
                                infiniteScrollScript += pb.ClientJs.getJSTag('var infiniteScrollSection = "' + section + '";');
                            }
                            else if(topic) {
                                infiniteScrollScript += pb.ClientJs.getJSTag('var infiniteScrollTopic = "' + topic + '";');
                            }
                            cb(null, new pb.TemplateValue(infiniteScrollScript, false));
                        }
                    });
                    self.ts.registerLocal('articles', function(flag, cb) {
                        var tasks = util.getTasks(data.content, function(content, i) {
                            return function(callback) {
                                if (i >= contentSettings.articles_per_page) {//TODO, limit articles in query, not throug hackery
                                    callback(null, '');
                                    return;
                                }
                                self.renderContent(content[i], contentSettings, data.nav.themeSettings, i, callback);
                            };
                        });
                        async.parallel(tasks, function(err, result) {
                            cb(err, new pb.TemplateValue(result.join(''), false));
                        });
                    });
                    self.ts.registerLocal('page_name', function(flag, cb) {
                        self.getContentSpecificPageName(util.isArray(data.content) && data.content.length > 0 ? data.content[0] : null, cb);
                    });

                    self.getSideNavigation(data.content, function(sideNavTemplate, sideNavItems) {
                        self.ts.load(sideNavTemplate, function(err, sideNavTemplate) {
                            if(util.isError(err)) {
                                sideNavTemplate = '';
                            }

                            self.ts.registerLocal('side_nav', new pb.TemplateValue(sideNavTemplate, false));

                            self.getTemplate(data.content, function(err, template) {
                                if (util.isError(err)) {
                                    throw err;
                                }

                                self.ts.registerLocal('angular', function(flag, cb) {

                                    var loggedIn       = pb.security.isAuthenticated(self.session);
                                    var commentingUser = loggedIn ? Comments.getCommentingUser(self.session.authentication.user) : null;
                                    var heroImage      = null;
                                    if(data.content[0]) {
                                        heroImage = data.content[0].hero_image ? data.content[0].hero_image: null;
                                    }

                                    var objects = {
                                        contentSettings: contentSettings,
                                        loggedIn: loggedIn,
                                        commentingUser: commentingUser,
                                        themeSettings: data.nav.themeSettings,
                                        articles: data.content,
                                        hero_image: heroImage,
                                        sideNavItems: sideNavItems,
                                        trustHTML: 'function(string){return $sce.trustAsHtml(string);}'
                                    };
                                    var angularData = pb.ClientJs.getAngularController(objects, ['ngSanitize']);
                                    cb(null, angularData);
                                });
                                self.ts.load(template, function(err, result) {
                                    if (util.isError(err)) {
                                        throw err;
                                    }

                                    var loggedIn = pb.security.isAuthenticated(self.session);
                                    var commentingUser = loggedIn ? Comments.getCommentingUser(self.session.authentication.user) : null;
                                    var heroImage = null;
                                    if(data.content[0]) {
                                        heroImage = data.content[0].hero_image ? data.content[0].hero_image: null;
                                    }
                                    cb({content: result});
                                });
                            });
                        });
                    });
                });
            });
        });
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
