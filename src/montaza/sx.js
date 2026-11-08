// Izgled Security dela (sx-) za celu aplikaciju: fontovi, tokeni, osnovni stilovi i oblačići.
// Uvozi se poslednji u App.js, da redosled CSS-a za Security ostane isti kao ranije (posle stilova Montaže).
import '@fontsource-variable/roboto-flex/wdth.css';
import '@fontsource-variable/golos-text/index.css';
import '@fontsource-variable/geist-mono/index.css';
import '../security/sx/tokens.css';
import '../security/sx/sx.css';
import '../security/sx/overlays.css';
import '../security/sx/forms.css';
import '../security/sx/page.css';
import '../security/sx/shell.css';
import './montaza.css';
import { installTooltips, installDomeHover } from '../security/sx/tooltips';

installTooltips();
installDomeHover();
