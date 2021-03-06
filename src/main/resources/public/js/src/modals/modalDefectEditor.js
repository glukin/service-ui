/*
 * This file is part of Report Portal.
 *
 * Report Portal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Report Portal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Report Portal.  If not, see <http://www.gnu.org/licenses/>.
 */
define(function (require) {
    'use strict';

    var $ = require('jquery');
    var _ = require('underscore');
    var ModalView = require('modals/_modalView');
    var App = require('app');
    var Util = require('util');
    var CoreService = require('coreService');
    var Localization = require('localization');
    var MarkdownEditor = require('components/markdown/MarkdownEditor');
    var SingletonDefectTypeCollection = require('defectType/SingletonDefectTypeCollection');
    var SingletonAppModel = require('model/SingletonAppModel');

    var config = App.getInstance();

    var ModalDefectEditor = ModalView.extend({
        template: 'tpl-modal-defect-editor',
        className: 'modal-defect-editor',

        bindings: {
            '[data-js-save-post-wrapper]': 'classes: {disabled: not(isBtsConfigure)}',
            '[data-js-save-load-wrapper]': 'classes: {disabled: not(isBtsAdded)}',
            '[data-js-save-post]': 'attr: {disabled: not(isBtsConfigure)}',
            '[data-js-save-load]': 'attr: {disabled: not(isBtsAdded)}'
        },
        events: {
            'click [data-js-save]': 'onClickSave',
            'click [data-js-select-issue]': 'selectIssueType',
            'click [data-js-close]': 'onClickClose',
            'click [data-js-cancel]': 'onClickCancel',
            'click [data-js-save-post]': 'onClickSavePost',
            'click [data-js-save-load]': 'onClickSaveLoad',
            'click [data-js-dropdown]': 'onClickDropdown'
        },
        computeds: {
            isBtsAdded: function () {
                return this.appModel.get('isBtsAdded');
            },
            isBtsConfigure: function () {
                return this.appModel.get('isBtsConfigure');
            }
        },
        onClickDropdown: function () {
            config.trackingDispatcher.trackEventNumber(524);
        },
        onClickSavePost: function () {
            config.trackingDispatcher.trackEventNumber(525);
            var self = this;
            this.onClickAction(function () {
                self.successClose({ action: 'postBug' });
            });
        },
        onClickSaveLoad: function () {
            config.trackingDispatcher.trackEventNumber(526);
            var self = this;
            this.onClickAction(function () {
                self.successClose({ action: 'loadBug' });
            });
        },
        initialize: function (option) {
            this.items = option.items;
            this.appModel = new SingletonAppModel();
            this.defectTypesCollection = new SingletonDefectTypeCollection();
            this.defectTypesCollection.ready.done(function () {
                this.render(option);
            }.bind(this));
            this.selectedIssue = null;
        },

        render: function () {
            this.$el.html(Util.templates(this.template, {
                item: this.items[0],
                isMultipleEdit: this.isMultipleEdit(),
                defectsGroup: config.defectsGroupSorted,
                subDefects: this.getSubDefects(),
                getIssueType: this.getIssueType,
                getIssueComment: this.getIssueComment,
                getDefectType: this.getDefectType()
            }));
            this.applyBindings();
            this.setupAnchors();
            this.setupMarkdownEditor();
        },

        isMultipleEdit: function () {
            return this.items.length > 1;
        },

        setupAnchors: function () {
            this.$type = $('[data-js-issue-name]', this.$el);
            this.$replaceComments = $('[data-js-replace-comment]', this.$el);
        },

        onKeySuccess: function () {
            $('[data-js-save]', this.$el).focus().trigger('click');
            // this.updateDefectType();
        },

        getIssueType: function (item) {
            var data = item.getIssue();
            return data.issue_type;
        },

        getIssueComment: function (item) {
            var data = item.getIssue();
            return data.comment ? data.comment : '';
        },

        getDefectType: function () {
            var self = this;
            return function (item) {
                var issue = self.getIssueType(item);
                var issueType = self.defectTypesCollection.getDefectType(issue);
                return issueType;
            };
        },

        getSubDefects: function () {
            var def = {};
            var defectTypes = this.defectTypesCollection.toJSON();
            _.each(defectTypes, function (d) {
                var type = d.typeRef;
                if (def[type]) {
                    def[type].push(d);
                } else {
                    def[type] = [d];
                }
            });
            return def;
        },

        selectIssueType: function (e) {
            var el = $(e.currentTarget);
            var locator = el.data('locator');
            var issueType = this.defectTypesCollection.getDefectType(locator);
            var menu = el.closest('.dropdown-menu');

            $('label', menu).removeClass('selected');
            el.addClass('selected');
            this.selectedIssue = locator;
            this.$type.text(issueType.longName).attr('class', el.find('.badge').attr('class'));
            this.$type.closest('[data-js-issue-title]').data('id', this.selectedIssue);
            $('[data-js-noissue-name]', this.$el).hide();
            $('[data-js-issue-title]', this.$el).show();
            $('[data-js-issue-title] i', this.$el).css('background', issueType.color);
            if (this.getIssueType(this.items[0]) !== this.selectedIssue ) {
                this.disableHideBackdrop();
            }
        },
        setupMarkdownEditor: function () {
            this.markdownEditor = new MarkdownEditor({
                value: (this.items.length !== 1) ? '' : this.getIssueComment(this.items[0]),
                placeholder: Localization.dialog.commentForDefect
            });
            $('[data-js-issue-comment]', this.$el).html(this.markdownEditor.$el);
        },
        onShown: function () {
            this.markdownEditor.update();
            this.listenTo(this.markdownEditor, 'change', this.disableHideBackdrop);
            this.initState = {
                comment: this.markdownEditor.getValue(),
                selectedIssue: this.selectedIssue,
                replaceComments: this.$replaceComments.is(':checked')
            };
        },
        isChanged: function () {
            if (this.initState.comment === this.markdownEditor.getValue() &&
            this.initState.selectedIssue === this.selectedIssue &&
            this.initState.replaceComments === this.$replaceComments.is(':checked')) {
                return false;
            }
            return true;
        },
        onHide: function () {
            this.markdownEditor.destroy();
        },
        onClickClose: function () {
            config.trackingDispatcher.trackEventNumber(157);
        },
        onClickCancel: function () {
            config.trackingDispatcher.trackEventNumber(159);
        },
        onClickAction: function (successCalback) {
            var self = this;
            self.showLoading();
            this.updateDefectType().done(function () {
                successCalback();
            }).fail(function (error) {
                Util.ajaxFailMessenger(error, 'updateDefect');
            }).always(function () {
                self.hideLoading();
            });
        },
        onClickSave: function () {
            var self = this;
            this.onClickAction(function () { self.successClose(); });
        },
        updateDefectType: function () {
            var promise = $.Deferred();
            var comment = this.markdownEditor.getValue();
            var selectedIssue = this.selectedIssue;
            var issues = [];
            var replaceComments = this.$replaceComments.is(':checked');
            var self = this;
            if (!this.isChanged()) {
                promise.resolve();
                return promise;
            }
            config.trackingDispatcher.trackEventNumber(160);
            _.forEach(this.items, function (item) {
                var issue = item.getIssue();
                if ((replaceComments && this.isMultipleEdit()) || (!this.isMultipleEdit())) {
                    config.trackingDispatcher.trackEventNumber(158);
                    issue.comment = comment;
                }
                issue.issue_type = selectedIssue || this.getIssueType(item);
                issues.push({
                    test_item_id: item.get('id'),
                    issue: issue
                });
            }, this);
            CoreService.updateDefect({ issues: issues })
                .done(function () {
                    var itemIssue = this.getIssueType(this.items[0]);
                    if (selectedIssue && itemIssue !== selectedIssue) {
                        // config.trackingDispatcher.defectStateChange(itemIssue, selectedIssue);
                    }
                    Util.ajaxSuccessMessenger('updateDefect');
                    _.forEach(self.items, function (item) {
                        var issue = item.getIssue();
                        if ((replaceComments && this.isMultipleEdit()) ||
                            (!this.isMultipleEdit())) {
                            issue.comment = comment;
                        }
                        issue.issue_type = selectedIssue || this.getIssueType(item);
                        item.setIssue(issue);
                    }, self);
                    promise.resolve();
                }.bind(this))
                .fail(function (error) {
                    promise.reject(error);
                });
            return promise;
        }
    });

    return ModalDefectEditor;
});
