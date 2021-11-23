import re
import torch

from transformers.models.gpt2.modeling_gpt2 import GPT2LMHeadModel
from transformers.models.gpt2.tokenization_gpt2_fast import GPT2TokenizerFast
from transformers import AutoModelForCausalLM, AutoTokenizer
import flask
from flask import Flask

app = Flask(__name__)

from flask_cors import CORS
CORS(app)

tokenizer: GPT2TokenizerFast = None
model: GPT2LMHeadModel = None

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
_cache = {}


@app.route("/")
def index():
    return flask.send_file("index.html")


@app.route("/next/")
def next_api():
    global tokenizer, model
    if model is None:
        torch.set_grad_enabled(False)
        tokenizer = AutoTokenizer.from_pretrained("zyayoung/cv-full-paper")
        model = AutoModelForCausalLM.from_pretrained("zyayoung/cv-full-paper").to(device)
        torch.set_grad_enabled(False)

    sequence = flask.request.args.get("q", "").strip()
    if not sequence:
        sequence = '.'
    if sequence in _cache.keys():
        return _cache[sequence]

    inputs = tokenizer("\n" + sequence, return_tensors="pt")
    input_ids = inputs["input_ids"].tolist()[0]
    inputs = {k: v.to(device) for k, v in inputs.items()}

    # get logits of last hidden state
    next_token_logits = model(**inputs).logits[:, -1, :]
    next_token_logits[:, input_ids] -= 1

    # filter
    logits, indices = next_token_logits.cpu().topk(10, sorted=True)

    probs = logits.softmax(-1)
    keep = probs > 0.02
    probs = probs[keep].tolist()
    token_ids = indices[keep].tolist()
    tokens = [tokenizer.decode(t) for t in token_ids]
    _cache[sequence] = {
        "query": sequence,
        "items": [(t, p) for t, p in zip(tokens, probs)]
    }
    return _cache[sequence]


@app.route('/static/<path:path>')
def serve_static(path):
    return flask.send_from_directory('static', path)
