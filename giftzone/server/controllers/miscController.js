const { body } = require('express-validator');
const { query } = require('../config/db');
const { asyncHandler } = require('../utils/helpers');
const Settings = require('../models/settingModel');
const mail = require('../services/mailService');

const contactRules = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Please enter your name'),
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  body('subject').optional({ values: 'falsy' }).trim().isLength({ max: 160 }),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Please write a message of at least 10 characters'),
];
const newsletterRules = [body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail()];

const publicSettings = asyncHandler(async (req, res) => res.json(Settings.publicShape(await Settings.getAll())));

const contact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  await query('INSERT INTO contact_messages (name, email, subject, message) VALUES (?,?,?,?)', [name, email, subject || null, message]);
  mail.sendContactNotice({ name, email, subject, message });
  res.status(201).json({ message: "Thanks for reaching out! We'll reply within one business day." });
});

const subscribe = asyncHandler(async (req, res) => {
  await query('INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)', [req.body.email]);
  res.status(201).json({ message: "You're subscribed! Watch your inbox for gift ideas." });
});

// ---- admin ----
const listMessages = asyncHandler(async (req, res) =>
  res.json(await query('SELECT id, name, email, subject, message, created_at FROM contact_messages ORDER BY id DESC LIMIT 300')));

const deleteMessage = asyncHandler(async (req, res) => {
  await query('DELETE FROM contact_messages WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Message deleted' });
});

const listSubscribers = asyncHandler(async (req, res) =>
  res.json(await query('SELECT id, email, created_at FROM newsletter_subscribers ORDER BY id DESC LIMIT 1000')));

module.exports = { contactRules, newsletterRules, publicSettings, contact, subscribe, listMessages, deleteMessage, listSubscribers };