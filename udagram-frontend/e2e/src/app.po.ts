import { browser, by, element } from 'protractor';

export class AppPage {
  navigateTo(destination: string) {
    return browser.get(destination);
  }

  getTitle() {
    return browser.getTitle();
  }

  getPageOneTitleText() {
    return element(by.tagName('app-home')).element(by.deepCss('ion-title')).getText();
  }
}
