/*
 * Copyright 2016 EPAM Systems
 *
 *
 * This file is part of EPAM Report Portal.
 * https://github.com/epam/ReportPortal
 *
 * Report Portal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Report Portal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Report Portal.  If not, see <http://www.gnu.org/licenses/>.
 */
define(function (require) {
    'use strict';

    var $ = require('jquery');
    var _ = require('underscore');
    var Backbone = require('backbone');
    var Epoxy = require('backbone-epoxy');
    var Util = require('util');
    var Components = require('core/components');
    var SingletonUserStorage = require('storage/SingletonUserStorage');
    var ParentStepItemView = require('launches/stepLevel/ParentStepItemView');

    var LaunchSuiteTestItemsView = Epoxy.View.extend({
        className: 'launch-suite-step-items',
        template: 'tpl-launch-suite-step-items',

        initialize: function (options) {
            var self = this;
            this.context = options.context;
            this.itemView = options.itemView;
            this.filterModel = options.filterModel;
            this.userStorage = new SingletonUserStorage();
            this.listenTo(this.collection, 'reset', this.renderItems);
            this.listenTo(this.collection, 'loading', this.onLoadingCollection);
            this.listenTo(this.collection, 'change:time:format', this.onChangeTimeFormat);
            this.listenTo(this.collection, 'change', this.checkForFiltersAndReloadCollection);
            this.onChangeTimeFormat(true);
            this.render();
            this.renderedItems = [];
            this.pagingModel = new Backbone.Model();

            this.paging = new Components.PagingToolbar({
                el: $('[data-js-paginate-container]', this.$el),
                model: this.pagingModel
            });
            this.renderItems();

            this.listenTo(this.paging, 'page', this.onChangePage);
            this.listenTo(this.paging, 'count', this.onChangePageCount);
            if (!this.collection.models.length) {
                this.$el.addClass('not-found');
            }
            $(window)
                .off('resize.launchItems')
                .on('resize.launchItems', _.debounce(self.activateAccordions.bind(self), 100));
        },
        activateNextId: function (id) {
            var activeItem = this.collection.get(id);
            if (activeItem) {
                activeItem.trigger('scrollToAndHighlight');
            }
        },
        onChangeTimeFormat: function (silent) {
            var timeFormat = this.userStorage.get('startTimeFormat');
            if (!silent) {
                if (timeFormat === 'exact') {
                    timeFormat = '';
                } else {
                    timeFormat = 'exact';
                }
                this.userStorage.set('startTimeFormat', timeFormat);
            }
            if (timeFormat) {
                this.$el.addClass('exact-driven');
            } else {
                this.$el.removeClass('exact-driven');
            }
        },
        render: function () {
            this.$el.html(Util.templates(this.template, {}));
        },
        onShow: function () {
            this.activateAccordions();
        },
        activateAccordions: function () {
            _.each(this.renderedItems, function (view) {
                view.activateAccordion && view.activateAccordion();
            });
        },
        onLoadingCollection: function (state) {
            if (state) {
                this.$el.addClass('load').removeClass('not-found');
                return;
            }
            this.activateAccordions();
            this.$el.removeClass('load');
            if (!this.collection.models.length) {
                this.$el.addClass('not-found');
            }
        },
        onChangePage: function (page) {
            this.collection.setPaging(page);
        },
        onChangePageCount: function (count) {
            this.collection.setPaging(1, count);
        },
        renderItems: function () {
            var $itemsContainer = $('[data-js-launches-container]', this.$el);
            var isAllCases = this.collection.validateForAllCases();
            var self = this;
            $itemsContainer.html('');
            if (isAllCases) {
                var parentPath = {};
                _.each(self.collection.models, function (model) {
                    var needParentLine = self.isValidForParent(model, parentPath);
                    if (needParentLine) {
                        parentPath = needParentLine;
                        var prentItem = new ParentStepItemView({
                            context: self.context,
                            parentPath: needParentLine,
                            launchId: model.get('launchId')
                        });
                        $itemsContainer.append(prentItem.$el);
                        self.renderedItems.push(prentItem);
                    }
                    var item = new self.itemView({ model: model, filterModel: self.filterModel });
                    $itemsContainer.append(item.$el);
                    self.renderedItems.push(item);
                });
            } else {
                _.each(self.collection.models, function (model) {
                    var item = new self.itemView({ model: model, filterModel: self.filterModel });
                    $itemsContainer.append(item.$el);
                    self.renderedItems.push(item);
                });
            }
            this.pagingModel.set(this.collection.pagingData);
            this.paging.render();
        },
        isValidForParent: function (item, parentLine) {
            if (_.isEmpty(parentLine) || !_.isEqual(item.get('path_names'), parentLine)) {
                parentLine = item.get('path_names');
                return parentLine;
            }
            return false;
        },
        checkForFiltersAndReloadCollection: function (model) {
            var self = this;
            var reload = false;
            _.each(model.changedAttributes(), function (attr, key) {
                _.each(self.filterModel.getEntitiesObj(), function (entity) {
                    var entityField = entity.filtering_field;
                    if (entityField === 'issue$issue_type' || entityField === 'issue$issue_comment') {
                        entityField = 'issue';
                    }
                    if (key === entityField) {
                        reload = true;
                    }
                });
            });
            if (reload) {
                this.listenToOnce(model, 'updated', function () {
                    self.collection.load();
                });
            }
        },
        onDestroy: function () {
            $(window).off('resize.launchItems');
            while (this.renderedItems.length) {
                this.renderedItems.pop().destroy();
            }
            this.$el.remove();
            delete this;
        }
    });

    return LaunchSuiteTestItemsView;
});
