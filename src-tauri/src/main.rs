#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::borrow::Cow;
use tauri::http::header::{HeaderName, HeaderValue};
use tauri::webview::WebviewWindowBuilder;
use tauri::utils::config::WebviewUrl;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Astra/log")
                .inner_size(1440.0, 900.0)
                .resizable(true)
                .on_web_resource_request(|_request, response: &mut tauri::http::Response<Cow<'static, [u8]>>| {
                    let headers = response.headers_mut();
                    headers.insert(
                        HeaderName::from_static("cross-origin-embedder-policy"),
                        HeaderValue::from_static("require-corp"),
                    );
                    headers.insert(
                        HeaderName::from_static("cross-origin-opener-policy"),
                        HeaderValue::from_static("same-origin"),
                    );
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
