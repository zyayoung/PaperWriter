const { Textcomplete } = require("@textcomplete/core")
const { TextareaEditor } = require("@textcomplete/textarea")

const editorElement = document.getElementById("editor");
const checkElement = document.getElementById("continuous");
const editor = new TextareaEditor(editorElement)

const strategy = {
  id: "mention",
  match: /((.|\R)*)$/,
  index: 1,
  search: async (
    term,
    callback,
    match
  ) => {
    fetch(`/next/?q=${encodeURI(term)}`)
      .then(response => response.json())
      .then(data => {
        callback(data.items.map(e => ({
          token: e[0],
          prob: e[1],
          text: term + e[0]
        })))
        if (document.querySelector("#continuous").checked)
          setTimeout(() => {
            let v = Math.random();
            let id = 0;
            data.items.forEach((e, i) => { if (v > 0 && (v -= e[1]) < 0) id = i });
            textcomplete.dropdown.activate(id)
            setTimeout(() => {
              editorElement.value = term + data.items[id][0]
              textcomplete.trigger(editorElement.value);
            }, 50);
          }, 0);
      });
  },
  cache: false,
  template: ({ token }) =>
    `<small>${token}</small>`,
  replace: ({ text }) => text
}

const option = {
  dropdown: {
    className: "dropdown-menu textcomplete-dropdown",
    maxCount: 10,
    placement: "auto",
    header: (results) => "",
    footer: (results) => "",
    rotate: false,
    style: { display: "none", position: "absolute", zIndex: "1000" },
    parent: document.body,
    item: {
      className: "textcomplete-item",
      activeClassName: "textcomplete-item active",
    }
  }
}

const textcomplete = new Textcomplete(editor, [strategy], option)
checkElement.onchange = (e) => {
  if (e.target.value) {
    textcomplete.dropdown.hide();
    textcomplete.trigger(editorElement.value);
  }
  editorElement.focus();
  e.preventDefault();
}
