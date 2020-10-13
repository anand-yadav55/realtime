const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true
    },
    receiver: {
        type: String,
        required: true
    },
    sendmessage: {
        type: String,
        required: true
    }
},{timestamps: true});

const message = mongoose.model('message', messageSchema);
module.exports = message;