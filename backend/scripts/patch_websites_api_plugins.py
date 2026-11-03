from pathlib import Path

path = Path("backend/src/api/v1/websites_api.py")
content = path.read_text(encoding="utf-8")

old_model = """    two_factor_recovery_codes: list[str] | None = None"""

new_model = """    two_factor_recovery_codes: list[str] | None = None
    plugin_slug: str | None = None
    activate: bool | None = None
    version: str | None = None"""

assert old_model in content, "old_model not found in websites_api.py!"
content = content.replace(old_model, new_model, 1)

old_process_action = """        elif body.action in ("update_theme", "update_all_themes"):
            cur_t = list(ws.get("themes") or [])
            for t in cur_t:
                ts = t.get("slug") or t.get("id") or ""
                if body.action == "update_all_themes" or (target_tslug and (ts == target_tslug or target_tslug in ts)):
                    t["update_available"] = False
                    if t.get("new_version"):
                        t["version"] = t["new_version"]
            site_updates["themes"] = cur_t"""

new_process_action = """        elif body.action in ("update_theme", "update_all_themes"):
            cur_t = list(ws.get("themes") or [])
            for t in cur_t:
                ts = t.get("slug") or t.get("id") or ""
                if body.action == "update_all_themes" or (target_tslug and (ts == target_tslug or target_tslug in ts)):
                    t["update_available"] = False
                    if t.get("new_version"):
                        t["version"] = t["new_version"]
            site_updates["themes"] = cur_t
        elif body.action == "delete_plugin":
            cur_p = list(ws.get("plugins") or [])
            site_updates["plugins"] = [
                p for p in cur_p
                if not (
                    (target_pfile and (p.get("file") == target_pfile or target_pfile in (p.get("file") or ""))) or
                    (target_pid and (p.get("id") == target_pid or target_pid in (p.get("id") or "")))
                )
            ]
        elif body.action == "delete_theme":
            cur_t = list(ws.get("themes") or [])
            site_updates["themes"] = [
                t for t in cur_t
                if not (target_tslug and (t.get("slug") == target_tslug or t.get("id") == target_tslug or target_tslug in (t.get("slug") or "")))
            ]"""

assert old_process_action in content, "old_process_action not found in websites_api.py!"
content = content.replace(old_process_action, new_process_action, 1)

old_url_params = """        if body.type:
            url_params += f"&type={body.type}"
        if api_key:"""

new_url_params = """        if body.type:
            url_params += f"&type={body.type}"
        if getattr(body, "plugin_slug", None) or getattr(body, "slug", None):
            p_s = getattr(body, "plugin_slug", None) or getattr(body, "slug", None)
            url_params += f"&plugin_slug={p_s}&slug={p_s}"
        if getattr(body, "activate", None) is not None:
            url_params += f"&activate={1 if body.activate else 0}"
        if api_key:"""

assert old_url_params in content, "old_url_params not found in websites_api.py!"
content = content.replace(old_url_params, new_url_params, 1)

old_request_timeout = "resp = requests.post(ep, json=action_payload, headers=headers, timeout=2.0, verify=False)"
new_request_timeout = """act_timeout = 25.0 if ("install" in body.action or "update" in body.action) else 6.0
                resp = requests.post(ep, json=action_payload, headers=headers, timeout=act_timeout, verify=False)"""

assert old_request_timeout in content, "old_request_timeout not found in websites_api.py!"
content = content.replace(old_request_timeout, new_request_timeout, 1)

path.write_text(content, encoding="utf-8")
print("Successfully patched websites_api.py with delete/install actions and dynamic timeout!")
