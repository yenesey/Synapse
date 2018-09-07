
///////////////////////////////////////////////////////////
/*
export default function (Vue, options) {
	Vue.deepClone = function (vnodes, createElement) {
		function cloneVNode(vnode) {
			var clonedChildren = vnode.children && vnode.children.map(cloneVNode);
			var cloned = createElement(vnode.tag, vnode.data, clonedChildren);
			cloned.text = vnode.text;
			cloned.isComment = vnode.isComment;
			cloned.componentOptions = vnode.componentOptions;
			cloned.elm = vnode.elm;
			cloned.context = vnode.context;
			cloned.ns = vnode.ns;
			cloned.isStatic = vnode.isStatic;
			cloned.key = vnode.key;
			return cloned;
		}
		return vnodes.map(cloneVNode);
	};
}
*/

export default function(vnodes, createElement) {
	function cloneVNode(vnode) {
		var clonedChildren = vnode.children && vnode.children.map(cloneVNode);
		var cloned = createElement(vnode.tag, vnode.data, clonedChildren);
		cloned.text = vnode.text;
		cloned.isComment = vnode.isComment;
		cloned.componentOptions = vnode.componentOptions;
		cloned.elm = vnode.elm;
		cloned.context = vnode.context;
		cloned.ns = vnode.ns;
		cloned.isStatic = vnode.isStatic;
		cloned.key = vnode.key;
		return cloned;
	}
	return vnodes.map(cloneVNode);
}