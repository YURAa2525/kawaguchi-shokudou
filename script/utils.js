// ----------------------------------------------
// 指定したDOM要素(引数1)の、指定したtransition-property(引数2)のdurationを取得して、ms単位で返す
// > transitionがｼｮｰﾄﾊﾝﾄﾞで指定されていても無問題
// ----------------------------------------------
function u_getDuration($target, property){
  // cssに指定されているｽﾀｲﾙを取得(動的に適用された変化も含む)
  const style = getComputedStyle($target[0]);

  // 取得したpropertyをｶﾝﾏ区切りで配列化して、余分な空白を除去
  const propertyList = style.transitionProperty.split(",").map(a => a.trim());

  // 取得したdurationをｶﾝﾏ区切りで配列化して、余分な空白を除去して、ms単位に変換
  // parseFloat()は、引数の末尾の単位を無視して変換する(0.4s → 0.4)
  const durationList = style.transitionDuration.split(",").map(a => parseFloat(a.trim()) * 1000);

  // cssで指定されているpropertyとdurationの数が一致しない場合は、1つ目のduration値を返す
  // duration値が同値につき省略している場合に該当し、これ以外で数が一致しない場合はcss上ありえない
  if (propertyList.length != durationList.length) return durationList[0];

  // propertyListから、指定した(引数2の)propertyを探してｲﾝﾃﾞｯｸｽ番号を返す
  // indexOf()は、引数がﾋｯﾄしない場合は-1を返す
  const propertyIx = propertyList.indexOf(property);

  // propertyListに指定した(引数2の)propertyが存在する場合は、それのduration値を返す
  // 存在しない場合は0を返す
  if (propertyIx != -1) {
    return durationList[propertyIx];
  } else {
    return 0;
  }  
}


// ----------------------------------------------
// $observerTarget  ：監査対象
//                    単一のDOM要素でも、複数のDOM要素（配列で渡されても）でも対応可
// viewTime         ：監査対象が何ms継続して可視されていたら 可視状態ﾌﾗｸﾞ に true を返すかを ms 単位で指定
//                    一度描画（可視）されたが、viewTime 後が不可視であれば 可視状態ﾌﾗｸﾞ は false が返る 
// viewTop          ：監視対象の何%描画されたら可視とみなすかを 0 ~ 1 までの少数で指定
//                    例）0.2 の場合は、監査対象の top:20% 以上描画されたら可視とみなす
// callback         ：正確には違うが、本処理の返り値を格納する集合体
//                    isInview（可視状態ﾌﾗｸﾞ）と、target（単一の可視要素）がｾｯﾄになっている
// ----------------------------------------------
function u_inview($observerTarget, viewTime, viewTop, callback) {
  // WeakMap を生成
  // > ｵﾌﾞｼﾞｪｸﾄのみをｷｰに設定することができ、ｷｰが参照不可になると自動的に削除される
  //   通常の Map ではｷｰが参照不可になっても自動削除はされない = ﾒﾓﾘに残り続ける ため、用途に合っている WeakMap を採用
  let visibleTimers = new WeakMap();

  // IntersectionObserver のｲﾝｽﾀﾝｽを生成し、監視対象の可視状態が変化 (ｲﾍﾞﾝﾄ発火) 時、
  // 第一引数の関数 (ここではｱﾛｰ関数 ((引数) => {}) を呼ぶ
  const observer = new IntersectionObserver((inviewMember) => {
    
    // 可視状態が変化 (ｲﾍﾞﾝﾄ発火) した要素が複数の場合も想定して、1つずつ処理
    // > inviewMember は、jQueryｵﾌﾞｼﾞｪｸﾄではなく、IntersectionObserverEntry配列 であるため、each() は使えない
    // > 可視 に変化だけでなく、不可視 に変化した場合も含める
    inviewMember.forEach((el) => {
      // 可視状態に変化した時、、、
      if (el.isIntersecting) {
        // viewTime 後も可視状態の場合、可視判定ture と 可視要素 を call元 に返す
        // → setTimeout の返り値は ﾀｲﾏｰID といい、処理 (今回は要素) と時間を結びつける識別子。これのおかげで ﾀｲﾏｰID から、紐づく操作が可能
        // → viewTime 後が不可視状態の場合は、else (不可視状態に変化した時) の処理が呼ばれる
        const timer = setTimeout(() => {
          callback(true, el.target);
        }, viewTime);

        // 要素 と ﾀｲﾏｰID を登録
        visibleTimers.set(el.target, timer);
      }
      // 不可視状態に変化した時、、、
      else {
        // setTimeout で予約した ﾀｲﾏｰID (visibleTimers.get(el.target)) に紐づく処理をｷｬﾝｾﾙし、
        // 可視判定false と 不可視要素 を call元 に返す
        clearTimeout(visibleTimers.get(el.target));
        callback(false, el.target);
      }
    })
  }, {

    // 監視対象の可視状態を変化させる基準を設定

    // 監視する領域を設定
    // → null → ﾌﾞﾗｳｻﾞ画面全体
    root: null,

    // 監視対象の当たり判定を設定
    // → "0px" → 監視対象ﾄﾞﾝﾋﾟｼｬ、"100px 0px" → 監視対象の上下100pxも監査対象とみなす
    rootMargin: "0px",

    // 監視対象の何%描画されたら可視とみなすかを設定
    // → 0.2 → 監視対象の top から 20% 以上描画されたら可視 (20% 未満の描画では不可視のまま)
    threshold: viewTop,
  });

  // 第一引数 $observerTarget の DOM要素 が複数の場合も想定して、1つずつ observer の監視対象として登録
  // > observe() は、DOM要素 をまとめて登録することはできないので、単一で登録する必要がある
  // > 登録 = 処理 ではなく、登録 = 監視開始 (条件に合えば処理) となる
  $observerTarget.each(function() {
    observer.observe(this);
  })
}