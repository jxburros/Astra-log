#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::http::header::{HeaderName, HeaderValue};

fn main() {
    tauri::Builder::default()
        .on_web_resource_request(|_request, response| {
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
