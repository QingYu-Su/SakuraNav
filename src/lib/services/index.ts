/**
 * @description 服务层入口 - 统一导出各仓库模块的数据访问函数
 */

export { getVisibleTags, getTagById, createTag, updateTag, deleteTag, reorderTags, getSiteTagsForIds, restoreTagSites, getTagCountByOwner } from "./tag-repository";
export { getPaginatedSites, getAllSitesForAdmin, getSiteById, createSite, updateSite, deleteSite, reorderSitesGlobal, reorderSitesInTag, getAllSiteUrls, getOnlineCheckSites, updateSiteOnlineStatus, updateSitesOnlineStatus, getSocialCardCount, getSocialCardSites, deleteAllSocialCardSites, deleteAllNormalSites, recomputeSearchText, updateSiteRecommendContext, getNoteCardCount, getNoteCardSites, deleteAllNoteCardSites } from "./site-repository";
export { startOnlineCheckScheduler, runImmediateBatchCheck } from "./online-check-scheduler";
export { getUrlOnlineStatusIfFresh, getUrlsOnlineStatusBatch, upsertUrlOnlineCache, upsertUrlOnlineCacheBatch, cleanOrphanUrlCache, applyUrlCacheToSites } from "./url-online-cache-repository";
export type { OnlineStatusChange } from "./site-repository";
export { getAllCards, getCardById, createCard, updateCard, deleteCard, reorderCards, getCardCount, deleteAllCards } from "./card-repository";
export { getAppearances, updateAppearances, deleteUserAppearances, getDefaultTheme, getAppSettings, updateAppSettings, getFloatingButtons, updateFloatingButtons, getVirtualTagSortOrders, saveVirtualTagSortOrders, insertVirtualTagsBySortOrder, injectVirtualTags, upsertAppSetting } from "./appearance-repository";
export { createAsset, getAsset, listStoredAssets, deleteAsset, getAssetsByKind, findOrphanNoteAssets, getNoteAttachments, renameAssetOriginalName, associateAssetsWithNote, unlinkAssetsFromNote, getAssetsByNoteId, deleteAssetsByNoteId } from "./asset-repository";
export { resetContentToDefaults, resetUserData, resetAdminToSeedState, mergeImportFromZip, clearUserData } from "./config-service";
export { getSearchSuggestions } from "./search-service";
export { hashPassword, verifyPassword, getAllUsers, getUserById, getUserByUsernameWithHash, isUsernameTaken, createUser, createOAuthUser, deleteUser, updateUserRole, copyAdminDataToUser, updateUserNickname, updateUserAvatar, updateUserPassword, updateUserUsername, markUserHasPassword, userHasPassword } from "./user-repository";
export { getOAuthAccount, getOAuthAccountsByUserId, getOAuthBindingsByUserId, createOAuthAccount, deleteOAuthAccount, deleteOAuthAccountsByUserId, getOAuthAccountCount } from "./oauth-repository";
export { getRelatedSites, saveRelatedSites, deleteAllRelationsForSite, addReverseRelation, applyAiRelationResults } from "./site-relation-repository";
export { collectExportData, applyImportData, cleanUserDataForImport, cleanNormalSitesDataForImport, computeDataSignature, verifyDataSignature, getTableColumns, dynamicInsert, type ExportDataResult } from "./data-portability-service";
export { getSnapshotMetas, getSnapshotById, getSnapshotCount, createSnapshot, deleteSnapshot, deleteSnapshotsAfter, renameSnapshot, cleanupExpiredSnapshots, restoreFromSnapshot, type SnapshotMeta, type SnapshotData } from "./snapshot-repository";
export { getNotificationChannels, getNotificationChannelById, createNotificationChannel, updateNotificationChannel, toggleNotificationChannel, deleteNotificationChannel, deleteNotificationChannelsByOwner, sendNotificationToUser } from "./notification-repository";
