const Workspace = require('../models/Workspace');
const Invitation = require('../models/Invitation');
const Permission = require('../models/Permission');
const Notification = require('../models/Notification');
const File = require('../models/File');
const User = require('../models/User');
const crypto = require('crypto');

class CollaborationService {
  async inviteUser(workspaceId, inviterId, inviteeEmail, role) {
    const inviter = await User.findById(inviterId);
    const token = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days validity

    const invitation = await Invitation.create({
      workspace: workspaceId,
      inviter: inviterId,
      inviteeEmail,
      role,
      token,
      status: 'Pending',
      expiryDate
    });

    const invitee = await User.findOne({ email: inviteeEmail });
    if (invitee) {
      await Notification.create({
        user: invitee._id,
        sender: inviterId,
        type: 'Shared',
        title: 'New Workspace Invitation',
        message: `${inviter.username} invited you to join a workspace.`,
        link: `/invitations/${invitation._id}`
      });
    }

    return invitation;
  }

  async acceptInvitation(invitationId, userId) {
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) throw new Error('Invitation not found');
    if (invitation.expiryDate < new Date()) {
      invitation.status = 'Expired';
      await invitation.save();
      throw new Error('Invitation expired');
    }

    invitation.status = 'Accepted';
    await invitation.save();

    const workspace = await Workspace.findById(invitation.workspace);
    if (workspace) {
      workspace.members.push({ user: userId, role: invitation.role });
      await workspace.save();

      await Notification.create({
        user: invitation.inviter,
        sender: userId,
        type: 'InvitationAccepted',
        title: 'Invitation Accepted',
        message: `An invitation to join ${workspace.name} was accepted.`
      });
    }

    return workspace;
  }

  async declineInvitation(invitationId, userId) {
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) throw new Error('Invitation not found');

    invitation.status = 'Declined';
    await invitation.save();

    await Notification.create({
      user: invitation.inviter,
      sender: userId,
      type: 'InvitationDeclined',
      title: 'Invitation Declined',
      message: `An invitation to join workspace was declined.`
    });

    return invitation;
  }

  async shareFolder(fileId, userId, targetUserId, role) {
    const file = await File.findById(fileId);
    if (!file || !file.isFolder) throw new Error('Folder not found');

    const permission = await Permission.create({
      file: fileId,
      user: targetUserId,
      role
    });

    const inheritPermissions = async (folderId) => {
      const children = await File.find({ parentFolder: folderId });
      for (const child of children) {
        await Permission.create({
          file: child._id,
          user: targetUserId,
          role,
          inheritedFrom: fileId
        });
        if (child.isFolder) {
          await inheritPermissions(child._id);
        }
      }
    };

    await inheritPermissions(fileId);

    await Notification.create({
      user: targetUserId,
      sender: userId,
      type: 'Shared',
      title: 'Folder Shared',
      message: `A folder "${file.name}" has been shared with you.`,
      link: `/files?folder=${fileId}`
    });

    return permission;
  }
}

module.exports = new CollaborationService();
