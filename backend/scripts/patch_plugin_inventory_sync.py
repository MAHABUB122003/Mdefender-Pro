from pathlib import Path

waf_file = Path("plugin_source/mdefender-pro/waf-firewall.php")
content = waf_file.read_text(encoding="utf-8")

# 1. Add lifecycle hooks right after 2FA initialization
hook_block = """// Initialize Two-Factor Authentication Engine
if (class_exists('WAF_FW_2FA')) {
    WAF_FW_2FA::instance();
}

// Instant Bidirectional Cloud Inventory Synchronization Hooks
if (!function_exists('waf_fw_sync_inventory_to_cloud')) {
    function waf_fw_sync_inventory_to_cloud() {
        if (class_exists('WAF_FW_ML_Api_Client')) {
            $client = WAF_FW_ML_Api_Client::instance();
            if ($client && $client->is_available()) {
                $client->heartbeat();
            }
        }
    }
}
add_action('waf_fw_cloud_heartbeat', 'waf_fw_sync_inventory_to_cloud');
add_action('activated_plugin', 'waf_fw_sync_inventory_to_cloud', 20);
add_action('deactivated_plugin', 'waf_fw_sync_inventory_to_cloud', 20);
add_action('deleted_plugin', 'waf_fw_sync_inventory_to_cloud', 20);
add_action('switch_theme', 'waf_fw_sync_inventory_to_cloud', 20);
add_action('upgrader_process_complete', 'waf_fw_sync_inventory_to_cloud', 20);
"""

old_2fa_init = """// Initialize Two-Factor Authentication Engine
if (class_exists('WAF_FW_2FA')) {
    WAF_FW_2FA::instance();
}"""

assert old_2fa_init in content, "old_2fa_init not found in waf-firewall.php!"
content = content.replace(old_2fa_init, hook_block, 1)

# 2. Add remote actions in webhook handler (around line 1355)
old_webhook_plugin_block = """                    if ($target_status === 'active' || $target_status === 'activate') {
                        activate_plugin($plugin_file);
                        $action_result = ['success' => true, 'plugin' => $plugin_file, 'status' => 'active'];
                    } else {
                        deactivate_plugins($plugin_file);
                        $action_result = ['success' => true, 'plugin' => $plugin_file, 'status' => 'inactive'];
                    }
                }
            } elseif ($action === 'update_plugin') {"""

new_webhook_plugin_block = """                    if ($target_status === 'active' || $target_status === 'activate') {
                        activate_plugin($plugin_file);
                        $action_result = ['success' => true, 'plugin' => $plugin_file, 'status' => 'active'];
                    } else {
                        deactivate_plugins($plugin_file);
                        $action_result = ['success' => true, 'plugin' => $plugin_file, 'status' => 'inactive'];
                    }
                }
            } elseif ($action === 'delete_plugin') {
                if (!function_exists('get_plugins')) {
                    require_once ABSPATH . 'wp-admin/includes/plugin.php';
                }
                require_once ABSPATH . 'wp-admin/includes/file.php';
                $plugin_file = sanitize_text_field($_REQUEST['plugin_file'] ?? $pushed_data['plugin_file'] ?? $_REQUEST['plugin'] ?? $pushed_data['plugin'] ?? '');
                if (!$plugin_file) {
                    $pid = sanitize_text_field($_REQUEST['plugin_id'] ?? $pushed_data['plugin_id'] ?? '');
                    if ($pid && function_exists('get_plugins')) {
                        foreach (get_plugins() as $pfile => $pdata) {
                            if (sanitize_title($pdata['Name']) === $pid || strpos($pfile, $pid) !== false) {
                                $plugin_file = $pfile;
                                break;
                            }
                        }
                    }
                }
                if ($plugin_file && strpos($plugin_file, 'mdefender-pro') === false) {
                    deactivate_plugins($plugin_file);
                    $del_res = delete_plugins([$plugin_file]);
                    $action_result = ['success' => !is_wp_error($del_res), 'plugin' => $plugin_file, 'status' => 'deleted', 'message' => "Plugin {$plugin_file} deleted from server"];
                } else {
                    $action_result = ['success' => false, 'message' => 'Cannot delete security suite or plugin file missing'];
                }
            } elseif ($action === 'install_plugin') {
                require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
                require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
                require_once ABSPATH . 'wp-admin/includes/plugin.php';
                require_once ABSPATH . 'wp-admin/includes/file.php';
                $slug = sanitize_title($_REQUEST['plugin_slug'] ?? $pushed_data['plugin_slug'] ?? $_REQUEST['slug'] ?? $pushed_data['slug'] ?? '');
                $do_activate = !empty($_REQUEST['activate']) || !empty($pushed_data['activate']);
                if ($slug) {
                    $api = plugins_api('plugin_information', ['slug' => $slug, 'fields' => ['sections' => false]]);
                    if (!is_wp_error($api) && !empty($api->download_link)) {
                        $skin = class_exists('WP_Ajax_Upgrader_Skin') ? new WP_Ajax_Upgrader_Skin() : new Automatic_Upgrader_Skin();
                        $upgrader = new Plugin_Upgrader($skin);
                        $install_res = $upgrader->install($api->download_link);
                        if ($do_activate && !is_wp_error($install_res)) {
                            $installed_plugin = $upgrader->plugin_info();
                            if ($installed_plugin) {
                                activate_plugin($installed_plugin);
                            }
                        }
                        $action_result = ['success' => true, 'slug' => $slug, 'status' => 'installed', 'message' => "Plugin '{$slug}' installed successfully"];
                    } else {
                        $action_result = ['success' => false, 'message' => is_wp_error($api) ? $api->get_error_message() : "Plugin '{$slug}' not found in WordPress repository"];
                    }
                }
            } elseif ($action === 'delete_theme') {
                require_once ABSPATH . 'wp-admin/includes/theme.php';
                require_once ABSPATH . 'wp-admin/includes/file.php';
                $theme_slug = sanitize_title($_REQUEST['theme_slug'] ?? $pushed_data['theme_slug'] ?? $_REQUEST['theme'] ?? $pushed_data['theme'] ?? $_REQUEST['slug'] ?? $pushed_data['slug'] ?? '');
                $active_stylesheet = get_stylesheet();
                if ($theme_slug && $theme_slug !== $active_stylesheet) {
                    $del_res = delete_theme($theme_slug);
                    $action_result = ['success' => !is_wp_error($del_res), 'theme' => $theme_slug, 'status' => 'deleted', 'message' => "Theme '{$theme_slug}' deleted successfully"];
                } else {
                    $action_result = ['success' => false, 'message' => 'Cannot delete active theme or missing theme slug'];
                }
            } elseif ($action === 'install_theme') {
                require_once ABSPATH . 'wp-admin/includes/theme-install.php';
                require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
                require_once ABSPATH . 'wp-admin/includes/theme.php';
                require_once ABSPATH . 'wp-admin/includes/file.php';
                $slug = sanitize_title($_REQUEST['theme_slug'] ?? $pushed_data['theme_slug'] ?? $_REQUEST['theme'] ?? $pushed_data['theme'] ?? $_REQUEST['slug'] ?? $pushed_data['slug'] ?? '');
                $do_activate = !empty($_REQUEST['activate']) || !empty($pushed_data['activate']);
                if ($slug) {
                    $api = themes_api('theme_information', ['slug' => $slug, 'fields' => ['sections' => false]]);
                    if (!is_wp_error($api) && !empty($api->download_link)) {
                        $skin = class_exists('WP_Ajax_Upgrader_Skin') ? new WP_Ajax_Upgrader_Skin() : new Automatic_Upgrader_Skin();
                        $upgrader = new Theme_Upgrader($skin);
                        $install_res = $upgrader->install($api->download_link);
                        if ($do_activate && !is_wp_error($install_res)) {
                            switch_theme($slug);
                        }
                        $action_result = ['success' => true, 'slug' => $slug, 'status' => 'installed', 'message' => "Theme '{$slug}' installed successfully"];
                    } else {
                        $action_result = ['success' => false, 'message' => is_wp_error($api) ? $api->get_error_message() : "Theme '{$slug}' not found in WordPress repository"];
                    }
                }
            } elseif ($action === 'sync_inventory' || $action === 'get_inventory' || $action === 'refresh_plugins' || $action === 'refresh_themes') {
                $action_result = ['success' => true, 'status' => 'synced', 'message' => 'Full site inventory synchronized successfully'];
            } elseif ($action === 'update_plugin') {"""

assert old_webhook_plugin_block in content, "old_webhook_plugin_block not found in waf-firewall.php!"
content = content.replace(old_webhook_plugin_block, new_webhook_plugin_block, 1)

# 3. Add to REST route handler as well
old_rest_plugin_block = """                    if ($target_status === 'active' || $target_status === 'activate') {
                        activate_plugin($plugin_file);
                        $action_result = ['success' => true, 'plugin' => $plugin_file, 'status' => 'active'];
                    } else {
                        deactivate_plugins($plugin_file);
                        $action_result = ['success' => true, 'plugin' => $plugin_file, 'status' => 'inactive'];
                    }
                }
            } elseif ($action === 'update_plugin') {"""

# Notice in the file there's a second occurrence for rest route!
assert old_rest_plugin_block in content, "old_rest_plugin_block second occurrence not found!"
content = content.replace(old_rest_plugin_block, new_webhook_plugin_block, 1)

waf_file.write_text(content, encoding="utf-8")
print("Successfully patched waf-firewall.php with inventory hooks and control actions!")

