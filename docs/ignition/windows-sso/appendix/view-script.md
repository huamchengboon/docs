# The page, as a script

Generates the `Main` view (fixed layout, bindings, roles transform). Run with the Designer closed, then restart the Gateway or Scan File System.
{ .lead }

The script has four parts: a `Label` helper that builds one label component, the list of labels, a script transform that turns the roles into a readable list, and the two files it writes. Each role entry prints as `[Name, Good_Unspecified, timestamp]`, so the transform keeps only the group name. The second file, `resource.json`, must have the `"files"` key.

```powershell title="Make-View.ps1"
$f = 'C:\Program Files\Inductive Automation\Ignition\data\projects\SSOTest\com.inductiveautomation.perspective\views\Main\view.json'
New-Item -ItemType Directory -Force (Split-Path $f) | Out-Null

function Label($name,$x,$y,$w,$h,$expr,$size,$bold,$color,$text) {
  $style = [ordered]@{
    fontSize = $size
    color    = $color
  }
  if ($bold) {
    $style['fontWeight'] = 'bold'
  }

  $c = [ordered]@{
    meta     = @{ name = $name }
    position = [ordered]@{
      x      = $x
      y      = $y
      width  = $w
      height = $h
    }
    type     = 'ia.display.label'
  }

  if ($expr) {
    $c['propConfig'] = @{
      'props.text' = @{
        binding = [ordered]@{
          type   = 'expr'
          config = @{ expression = $expr }
        }
      }
    }
    $c['props'] = @{ style = $style }
  } else {
    $c['props'] = [ordered]@{ style = $style }
    if ($text) {
      $c['props']['text'] = $text
    }
  }

  $c
}

$children = @(
  (Label 'Heading'     30  25 640 40 $null 14 $false '#6b7280' 'SIGNED IN WITH WINDOWS SSO (AD FS)'),
  (Label 'Welcome'     30  65 640 60 '"Welcome, " + {session.props.auth.user.userName}' 40 $true '#111827' $null),
  (Label 'UsernameRow' 30 150 640 34 '"Username:  " + {session.props.auth.user.userName}' 20 $false '#111827' $null),
  (Label 'EmailRow'    30 190 640 34 '"Email:  " + {session.props.auth.user.email}' 20 $false '#111827' $null),
  (Label 'RolesRow'    30 230 640 90 $null 18 $false '#111827' $null),
  (Label 'IdpRow'      30 335 640 34 '"Identity provider:  " + {session.props.auth.idp}' 20 $false '#111827' $null),
  (Label 'AuthRow'     30 375 640 34 '"Authenticated:  " + toStr({session.props.auth.authenticated})' 20 $false '#111827' $null)
)

$code = "`tnames = []`n`ttry:`n`t`tfor r in value:`n`t`t`tnames.append(str(r).strip('[]').split(',')[0].strip())`n`texcept:`n`t`tnames = [str(value)]`n`treturn 'Roles:  ' + ', '.join(names)"

$roles = $children | Where { $_.meta.name -eq 'RolesRow' }
$roles['propConfig'] = @{
  'props.text' = @{
    binding = [ordered]@{
      type       = 'expr'
      config     = @{ expression = '{session.props.auth.user.roles}' }
      transforms = @(@{
        type = 'script'
        code = $code
      })
    }
  }
}

$view = [ordered]@{
  custom = @{}
  params = @{}
  props  = @{
    defaultSize = @{
      width  = 700
      height = 440
    }
  }
  root   = [ordered]@{
    type     = 'ia.container.coord'
    meta     = @{ name = 'root' }
    props    = @{
      mode  = 'fixed'
      style = @{ backgroundColor = '#f3f4f6' }
    }
    children = $children
  }
}
[IO.File]::WriteAllText($f, ($view | ConvertTo-Json -Depth 30), (New-Object Text.UTF8Encoding($false)))

$res = '{"scope":"G","version":1,"restricted":false,"overridable":true,"files":["view.json"],"attributes":{}}'
[IO.File]::WriteAllText((Join-Path (Split-Path $f) 'resource.json'), $res, (New-Object Text.UTF8Encoding($false)))
```

Page configuration (`page-config\config.json`) is `{"pages":{"/":{"viewPath":"Main"}}}` with a `resource.json` listing `config.json`. The Designer writes both for you.
