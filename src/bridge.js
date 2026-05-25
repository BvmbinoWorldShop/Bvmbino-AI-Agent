/**
 * bridge.js - Bridges modular functions to the global window scope for legacy HTML handlers.
 */

export async function initBridge() {
    console.log("Bvmbino Bridge: Loading modules dynamically...");

    const core = await import('./core.js');
    const store = await import('./store.js');
    const render = await import('./render.js');
    const ui = await import('./ui.js');
    const api = await import('./api.js');

    console.log("Bvmbino Bridge: Initializing global hooks...");

    // Core
    window.state = core.state;

    // UI
    window.toggleLeftSidebar = ui.toggleLeftSidebar;
    window.toggleRightSidebar = ui.toggleRightSidebar;
    window.openSb = ui.openSb;
    window.closeSb = ui.closeSb;
    window.toggleTools = ui.toggleTools;
    window.toggleHistory = ui.toggleHistory;
    window.setActiveClient = ui.setActiveClient;
    window.addNewClient = ui.addNewClient;
    window.deleteClient = ui.deleteClient;
    window.toggleSettings = ui.toggleSettings;
    window.toggleTranslation = ui.toggleTranslation;
    window.setModel = ui.setModel;
    window.toggleClients = ui.toggleClients;
    window.newChat = ui.newChat;
    window.openTrain = ui.openTrain;
    window.slash = ui.slash;
    window.exportLastMd = ui.exportLastMd;
    window.exportTranscript = ui.exportTranscript;
    window.toggleMpanel = ui.toggleMpanel;
    window.openMpanel = ui.openMpanel;
    window.closeMpanel = ui.closeMpanel;
    window.resumeSession = ui.resumeSession;
    window.renderHistory = ui.renderHistory;
    window.renderClients = ui.renderClients;
    window.handleFiles = ui.handleFiles;
    window.removeFile = ui.removeFile;
    window.copyMsg = ui.copyMsg;
    window.copyLast = ui.copyLast;
    window.regenLast = api.regenLast;
    window.exportMsgPdf = ui.exportMsgPdf;
    window.exportMsgHtml = ui.exportMsgHtml;
    window.exportLastPdf = ui.exportLastPdf;
    window.saveAsPdf = ui.saveAsPdf;

    // Render
    window.renderWelcome = render.renderWelcome;
    window.toggleGrid = render.toggleGrid;
    window.rmWelcome = render.rmWelcome;
    window.addUserMsg = render.addUserMsg;
    window.appendAiText = render.appendAiText;

    // API
    window.send = api.send;
    window.callAI = api.callAI;
    window.handleGenImage = api.handleGenImage;
    window.sendImgToChat = api.sendImgToChat;
    window.downloadImg = api.downloadImg;

    // Store
    window.saveSession = store.saveSession;
    window.deleteSession = store.deleteSession;
    window.saveVaultKey = store.saveVaultKey;
    window.updateParam = store.updateParam;
    window.saveMemoryTier = store.saveMemoryTier;
    window.saveToKnowledge = store.saveToKnowledge;
}
