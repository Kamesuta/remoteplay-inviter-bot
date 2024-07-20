/**
 * PanelData is used to show game information to Discord
 */
export interface PanelData {
  /** Game information */
  game: {
    /** Game name */
    name: string;
    /** Link to store page */
    store: string;
    /** Game image URL */
    image: string;
  };
}
