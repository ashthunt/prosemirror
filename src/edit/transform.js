import {Transform} from "../transform"

// ;; A selection-aware extension of `Transform`. Use
// `ProseMirror.tr` to create an instance.
export class EditorTransform extends Transform {
  constructor(pm) {
    super(pm.doc)
    this.pm = pm
  }

  // :: (?Object) → ?EditorTransform
  // Apply the transformation. Returns the transform, or `false` it is
  // was empty.
  apply(options) {
    return this.pm.apply(this, options)
  }

  // :: Selection
  // Get the editor's current selection, [mapped](#Selection.map)
  // through the steps in this transform.
  get selection() {
    return this.steps.length ? this.pm.selection.map(this) : this.pm.selection
  }

  // :: (?Node, ?bool) → EditorTransform
  // Replace the selection with the given node, or delete it if `node`
  // is null. When `inheritMarks` is true and the node is an inline
  // node, it inherits the marks from the place where it is inserted.
  replaceSelection(node, inheritMarks) {
    let {empty, from, to, node: selNode} = this.selection

    if (node && node.isInline && inheritMarks !== false)
      node = node.mark(empty ? this.pm.input.storedMarks : this.doc.marksAt(from))

    if (selNode && selNode.isTextblock && node && node.isInline) {
      // Putting inline stuff onto a selected textblock puts it
      // inside, so cut off the sides
      from++
      to--
    } else if (selNode) {
      // This node can not simply be removed/replaced. Remove its parent as well
      let rFrom = this.doc.resolve(from), depth = rFrom.depth
      while (depth && rFrom.node[depth].childCount == 1 &&
             !(node ? rFrom.node[depth].type.canContain(node) : rFrom.node[depth].type.canBeEmpty))
        depth--
      if (depth < rFrom.depth) {
        from = rFrom.before(depth + 1)
        to = rFrom.after(depth + 1)
      }
    } else if (node && node.isBlock) {
      let rFrom = this.doc.resolve(from)
      // Inserting a block node into a textblock. Try to insert it above by splitting the textblock
      if (rFrom.depth && rFrom.node[rFrom.depth - 1].type.canContain(node)) {
        this.delete(from, to)
        if (rFrom.parentOffset && rFrom.parentOffset < (rFrom = this.doc.resolve(from)).parent.content.size)
          this.split(from)
        return this.insert(from + 1, node)
      }
    }

    return this.replaceWith(from, to, node)
  }

  // :: () → EditorTransform
  // Delete the selection.
  deleteSelection() {
    return this.replaceSelection()
  }

  // :: (string) → EditorTransform
  // Replace the selection with a text node containing the given string.
  typeText(text) {
    return this.replaceSelection(this.pm.schema.text(text), true)
  }
}
