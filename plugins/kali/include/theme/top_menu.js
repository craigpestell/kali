/**
 * Extend the TopMenuService
 *
 */

var async = require('async');

module.exports = function KaliTopMenuServiceModule(pb) {
    const sliderItems = ['BIKE', 'POWERSPORTS'];

    //pb dependencies
    var util = pb.util;

    function KaliTopMenuService() {
    }


    KaliTopMenuService.getAccountButtons = pb.TopMenuService.getAccountButtons;
    //KaliTopMenuService.getTopMenu = pb.TopMenuService.getTopMenu;

    /**
     * Retrieves the theme settings, navigation data structure, and account buttons.
     * @static
     * @method getTopMenu
     * @param {Object} session The current user's session
     * @param {Localization} localizationService An instance of Localization to
     * translate default items
     * @param {Object} [options] An optional argument to provide more flexibility
     * to the menu construction. (pass in site: siteUId to select the proper tenant)
     * @param {String} [options.currUrl] The current request URL.
     * @param {Function} cb Callback function that takes three parameters. The
     * first are the theme's settings, the second is the navigation structure, and
     * the third is the account button structure.
     */
    KaliTopMenuService.getTopMenu = function (session, localizationService, options, cb) {
        if (util.isFunction(options)) {
            cb = options;
            options = {
                currUrl: null
            };
        }
        else if (!util.isObject(options)) {
            throw new Error('The options parameter must be an object');
        }

        var siteUId = pb.SiteService.getCurrentSite(options.site);
        //var helmetsData = KaliTopMenuService.getHelmetsData();
        var getTopMenu = function (session, localizationService, options, cb) {
            var tasks = {
                themeSettings: function (callback) {
                    var settingService = pb.SettingServiceFactory.getService(siteUId);
                    settingService.get('site_logo', function (err, logo) {
                        callback(null, {site_logo: logo});
                    });
                },

                formattedSections: function (callback) {
                    var sectionService = new pb.SectionService({site: siteUId});
                    sectionService.getFormattedSections(localizationService, options.currUrl, function (err, formattedSections) {
                        KaliTopMenuService.getHelmetData(formattedSections, function (err, formattedSectionsWithHelmets) {
                            // Add Helmets data to navigation

                            //console.log(formattedSectionsWithHelmets);

                            callback(null, formattedSectionsWithHelmets);
                        });

                    });
                },

                accountButtons: function (callback) {
                    pb.TopMenuService.getAccountButtons(session, localizationService, options.site, callback);
                }
            };
            async.parallel(tasks, function (err, result) {
                cb(result.themeSettings, result.formattedSections, result.accountButtons);
            });


        };
        getTopMenu(session, localizationService, options, cb);
    };
    //util.inherits(KaliTopMenuService, pb.TopMenuService);

    KaliTopMenuService.getHelmetData = function (formattedSections, cb) {
        var sectionService = new pb.SectionService({site: this.site}, true);
        sectionService.settings.get('section_map', function (err, sectionMap) {
            if (util.isError(err) || sectionMap == null) {
                cb(err, []);
                return;
            }

            var helmetService = new pb.CustomObjectService(this.site, true);

            var tasks = util.getTasks(formattedSections, function (data, i) {

                return function (callback) {

                    var where = {where: {Sections: {$in: [data[i].uid]}}};
                    helmetService.findByType('56bf79098daa054a1d1dd945', where, function (err, helmetData) {
                        if (util.isError(err)) {
                            cb(null, pb.config.siteName);
                            return;
                        }
                        if(helmetData.length) {
                            KaliTopMenuService.getHelmetMedia(helmetData, function (err, helmetMedia) {
                                //console.log(helmetMedia);
                                helmetData.media = helmetMedia;
                                formattedSections[i].helmets = helmetData;
                            });
                        }
                        callback(null, formattedSections[i]);

                    });
                };
            });
            async.parallel(tasks, function (err, result) {
                cb(err, result);
            });
        });
    };

KaliTopMenuService.getHelmetMedia = function (helmets, cb) {
    var mediaService = new pb.MediaService();

    var tasks = util.getTasks(helmets, function (data, i) {

        return function (callback) {

            mediaService.loadById(data[i]["Hero Image 1"], function (err, md) {

                if (util.isError(err) || md === null) {
                    cb(null, pb.config.siteName);
                    return;
                }
                data[i].media = md;
                if (data[i].Sections) {
                    for (var j = 0; j < data[i].Sections.length; j++) {
                        console.log(data[i].Sections[j]);
                    }

                }
                callback(err, data[i]);
            });

        };
    });
    async.parallel(tasks, function (err, result) {
        cb(err, result);
    });
};

/**
 * Returns a bootstrap ready ul list for a nav element
 * @static
 * @method getBootstrapNav
 * @param {Object}   navigation     Navigation object
 * @param {Object}   accountButtons Account buttons object
 * @param {Function} cb             Callback function
 */
KaliTopMenuService.getBootstrapNav = function (navigation, accountButtons, options, cb) {
    if (util.isFunction(options)) {
        cb = options;
        options = {};
    }

    var ts = new pb.TemplateService(options);
    var mediaService = new pb.MediaService();

    ts.load('elements/top_menu/link', function (err, linkTemplate) {
        ts.load('elements/top_menu/dropdown', function (err, dropdownTemplate) {
            ts.load('elements/top_menu/account_button', function (err, accountButtonTemplate) {
                ts.load('elements/top_menu/slider', function (err, sliderTemplate) {
                    ts.load('elements/top_menu/slider_slide', function (err, sliderSlideTemplate) {
                        ts.load('elements/top_menu/slider_script', function (err, sliderScriptTemplate) {

                            var bootstrapNav = ' ';
                            var subNav;
                            var sliderScript = sliderScriptTemplate;
                            var sliderScriptAdded = false;

                            for (var i = 0; i < navigation.length; i++) {
                                var dropdown = dropdownTemplate;
                                if (navigation[i].dropdown) {

                                    if (navigation[i].helmets && navigation[i].helmets.length){
                                        // Helmets exist for this navigation item. Build a slider
                                        subNav = ' ';

                                        navigation[i].helmets.forEach(function(helmet, h){
                                            subNav = subNav.concat(sliderSlideTemplate);
                                        });
                                        dropdown = sliderTemplate;

                                        if (sliderScriptAdded) {
                                            sliderScript += sliderScriptTemplate.split('^index^').join(i);
                                        } else {
                                            sliderScript = sliderScriptTemplate.split('^index^').join(i);

                                        }
                                        sliderScriptAdded = true;

                                    } else {
                                        subNav = ' ';
                                        for(var j = 0; j < navigation[i].children.length; j++)
                                        {
                                            if(!navigation[i].children[j]) {
                                                continue;
                                            }

                                            var childItem = linkTemplate;
                                            childItem = childItem.split('^active^').join((navigation[i].children[j].active) ? 'active' : '');
                                            childItem = childItem.split('^url^').join(navigation[i].children[j].url);
                                            childItem = childItem.split('^new_tab^').join(navigation[i].children[j].new_tab ? '_blank' : '_self');
                                            childItem = childItem.split('^name^').join(navigation[i].children[j].name);

                                            subNav = subNav.concat(childItem);
                                        }

                                    }

                                    //use index for unique slider css class names
                                    dropdown = dropdown.split('^index^').join(i);

                                    dropdown = dropdown.split('^navigation^').join(subNav);
                                    dropdown = dropdown.split('^active^').join((navigation[i].active) ? 'active' : '');
                                    dropdown = dropdown.split('^name^').join(navigation[i].name);

                                    bootstrapNav = bootstrapNav.concat(dropdown);
                                }
                                else {
                                    var linkItem = linkTemplate;
                                    linkItem = linkItem.split('^active^').join((navigation[i].active) ? 'active' : '');
                                    linkItem = linkItem.split('^url^').join(navigation[i].url);
                                    linkItem = linkItem.split('^new_tab^').join(navigation[i].new_tab ? '_blank' : '');
                                    linkItem = linkItem.split('^name^').join(navigation[i].name);

                                    bootstrapNav = bootstrapNav.concat(linkItem);
                                }
                                //console.log('index:', i);
                                //console.log(bootstrapNav);
                            }

                            var buttons = ' ';
                            for (i = 0; i < accountButtons.length; i++) {
                                var button = accountButtonTemplate;
                                button = button.split('^active^').join((accountButtons[i].active) ? 'active' : '');
                                button = button.split('^url^').join(accountButtons[i].href);
                                button = button.split('^title^').join(accountButtons[i].title);
                                button = button.split('^icon^').join(accountButtons[i].icon);

                                buttons = buttons.concat(button);
                            }
                            //console.log(bootstrapNav);
                            cb(bootstrapNav, buttons, sliderScript);
                        });
                    });
                });
            });
        });
    });
};


/**
 * @method getNavItems
 * @param {Object} options
 * @param {Localization} options.ls
 * @param {String} options.activeTheme
 * @param {Object} options.session
 * @param {String} options.currUrl
 * @param {Function} cb
 */
KaliTopMenuService.prototype.getNavItems = function (options, cb) {
    KaliTopMenuService.getTopMenu(options.session, options.ls, options, function (themeSettings, navigation, accountButtons) {
        KaliTopMenuService.getBootstrapNav(navigation, accountButtons, options, function (navigation, accountButtons, sliderScript) {
            var navItems = {
                themeSettings: themeSettings,
                navigation: navigation,
                accountButtons: accountButtons,
                sliderScript: sliderScript
            };
            cb(null, navItems);
        });
    });
};
//exports
return KaliTopMenuService;
}
;
