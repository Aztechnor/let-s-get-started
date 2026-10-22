declare module "*.asset.json" {
  interface LovableAsset {
    version: number;
    asset_id: string;
    project_id: string;
    url: string;
    r2_key: string;
    original_filename: string;
    size: number;
    content_type: string;
    created_at: string;
  }
  const value: LovableAsset;
  export default value;
}
