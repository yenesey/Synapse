ace.define("ace/theme/synapse",["require","exports","module","ace/lib/dom"], function(acequire, exports, module) {
"use strict";

exports.isDark = false;
exports.cssText = ".ace-synapse .ace_gutter {\
background: #ebebeb;\
border-right: 1px solid rgb(159, 159, 159);\
color: rgb(136, 136, 136);\
}\
.ace-synapse .ace_print-margin {\
width: 1px;\
background: #ebebeb;\
}\
.ace-synapse {\
background-color: #FFFFFF;\
color: black;\
}\
.ace-synapse .ace_fold {\
background-color: rgb(60, 76, 114);\
}\
.ace-synapse .ace_cursor {\
color: black;\
}\
.ace-synapse .ace_storage,\
.ace-synapse .ace_keyword,\
.ace-synapse .ace_variable {\
font-weight:bold;\
color:rgb(173, 35, 173);\
}\
.ace-synapse .ace_constant.ace_buildin {\
color: rgb(88, 72, 246);\
}\
.ace-synapse .ace_constant.ace_library {\
color: rgb(6, 150, 14);\
}\
.ace-synapse .ace_function {\
font-weight:bold;\
color: teal;\
}\
.ace-synapse .ace_string {\
color: rgb(67, 50, 234);\
}\
.ace-synapse .ace_comment {\
font-style:italic;\
color: rgb(113, 150, 130);\
}\
.ace-synapse .ace_comment.ace_doc {\
color: rgb(63, 95, 191);\
}\
.ace-synapse .ace_comment.ace_doc.ace_tag {\
color: rgb(127, 159, 191);\
}\
.ace-synapse .ace_constant.ace_numeric {\
color: green;\
}\
.ace-synapse .ace_tag {\
color: rgb(25, 118, 116);\
}\
.ace-synapse .ace_type {\
color: rgb(127, 0, 127);\
}\
.ace-synapse .ace_xml-pe {\
color: rgb(104, 104, 91);\
}\
.ace-synapse .ace_marker-layer .ace_selection {\
background: rgb(181, 213, 255);\
}\
.ace-synapse .ace_marker-layer .ace_bracket {\
margin: -1px 0 0 -1px;\
background: rgb(181, 213, 255);\
border: 1px solid rgb(102, 102, 102);\
}\
.ace-synapse .ace_meta.ace_tag {\
color:rgb(25, 118, 116);\
}\
.ace-synapse .ace_invisible {\
color: #ddd;\
}\
.ace-synapse .ace_entity.ace_other.ace_attribute-name {\
color:rgb(127, 0, 127);\
}\
.ace-synapse .ace_marker-layer .ace_step {\
background: rgb(255, 255, 0);\
}\
.ace-synapse .ace_active-line {\
background: rgb(232, 242, 254);\
}\
.ace-synapse .ace_gutter-active-line {\
background-color : #DADADA;\
}\
.ace-synapse .ace_marker-layer .ace_selected-word {\
border: 1px solid rgb(181, 213, 255);\
}\
.ace-synapse .ace_indent-guide {\
background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==\") right repeat-y;\
}";

exports.cssClass = "ace-synapse";

var dom = acequire("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});
