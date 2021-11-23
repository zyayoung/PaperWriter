const { Textcomplete } = require("@textcomplete/core")
const { TextareaEditor } = require("@textcomplete/textarea")

const editorElement = document.getElementById("editor");
const checkElement = document.getElementById("continuous");
const editor = new TextareaEditor(editorElement)
const _cache = {}

async function getSuggestions(term) {
  if (_cache[term] == null) {
    const response = await fetch(`/next/?q=${encodeURI(term)}`)
    const data = await response.json();
    const sugg = data.items.map(e => ({
      token: e[0],
      prob: e[1],
      text: term + e[0]
    }));
    _cache[term] = sugg;
    sugg.forEach((s) => {
      for (let i = 1; i < s.token.length; i++) {
        if (_cache[term + s.token.slice(0, i)] == null)
          _cache[term + s.token.slice(0, i)] = []
        _cache[term + s.token.slice(0, i)].push({ token: s.token.slice(i), prob: 1, text: s.text })
      }
    })
  }
  return _cache[term]
}

const strategy = {
  id: "mention",
  match: /((.|\R)*)$/,
  index: 1,
  search: async (
    term,
    callback,
    match
  ) => {
    const data = await getSuggestions(term);
    callback(data);
    if (document.querySelector("#continuous").checked) {
      let v = Math.random();
      let id = 0;
      data.forEach((e, i) => { if (v > 0 && (v -= e.prob) < 0) id = i });
      textcomplete.dropdown.activate(id)
      setTimeout(() => {
        editorElement.value = term + data[id].token
        textcomplete.trigger(editorElement.value);
      }, 0);
    }
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
