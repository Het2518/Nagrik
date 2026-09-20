'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// CitizenUser is the login account for the head-of-family.
// One account maps to exactly one family.
const citizenUserSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

citizenUserSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

citizenUserSchema.methods.isPasswordCorrect = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('CitizenUser', citizenUserSchema);
